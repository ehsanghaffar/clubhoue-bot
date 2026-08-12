/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type OpenAI from 'openai'
import { APIError } from 'openai'
import { OpenAiProvider, isTransientError } from '../src/core/ai/openai.provider.js'

vi.mock('../src/services/openai.service.js', () => ({
  getOpenAIClient: vi.fn()
}))

const { getOpenAIClient } = await import('../src/services/openai.service.js')

/**
 * Builds a fake OpenAI client whose chat.completions.create behaves as the test
 * dictates per-call, so we can drive success / transient / permanent failures
 * without any network access.
 */
const makeFakeClient = (behavior: Array<{ error?: Error, content?: string }>): OpenAI => {
  let call = 0
  const client = {
    chat: {
      completions: {
        create: vi.fn()
      }
    }
  } as unknown as OpenAI
  vi.mocked(client.chat.completions.create).mockImplementation((async () => {
    const idx = Math.min(call, behavior.length - 1)
    call += 1
    const step = behavior[idx]
    if (step.error != null) {
      throw step.error
    }
    return { choices: [{ message: { content: step.content ?? '' } }] }
  }) as unknown as OpenAI['chat']['completions']['create'])
  return client
}

describe('OpenAiProvider reliability', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('returns content on a successful completion', async () => {
    const provider = new OpenAiProvider()
    vi.mocked(getOpenAIClient).mockReturnValue(makeFakeClient([{ content: 'Hello Jan' }]))
    const result = await provider.complete({
      model: 'gpt-4o-mini',
      systemPrompt: 'sys',
      userPrompt: 'q',
      maxOutputTokens: 150,
      temperature: 0.4
    })
    expect(result).toBe('Hello Jan')
  })

  it('retries a transient 500 error then succeeds', async () => {
    const provider = new OpenAiProvider()
    vi.mocked(getOpenAIClient).mockReturnValue(makeFakeClient([
      { error: new APIError(500, undefined, 'Internal Server Error', undefined) },
      { content: 'recovered' }
    ]))

    const promise = provider.complete({
      model: 'gpt-4o-mini',
      systemPrompt: 'sys',
      userPrompt: 'q',
      maxOutputTokens: 150,
      temperature: 0.4
    })
    // Advance through the backoff delay.
    await vi.runAllTimersAsync()
    const result = await promise
    expect(result).toBe('recovered')
  })

  it('retries a transient 429 rate-limit error then succeeds', async () => {
    const provider = new OpenAiProvider()
    vi.mocked(getOpenAIClient).mockReturnValue(makeFakeClient([
      { error: new APIError(429, undefined, 'rate limited', undefined) },
      { content: 'ok after retry' }
    ]))
    const promise = provider.complete({
      model: 'gpt-4o-mini',
      systemPrompt: 'sys',
      userPrompt: 'q',
      maxOutputTokens: 150,
      temperature: 0.4
    })
    await vi.runAllTimersAsync()
    const result = await promise
    expect(result).toBe('ok after retry')
  })

  it('does NOT retry a permanent 401 invalid-key error', async () => {
    const provider = new OpenAiProvider()
    const client = makeFakeClient([
      { error: new APIError(401, undefined, 'invalid api key', undefined) },
      { content: 'should not reach' }
    ])
    vi.mocked(getOpenAIClient).mockReturnValue(client)
    const createSpy = vi.mocked(client.chat.completions.create)

    const result = await provider.complete({
      model: 'gpt-4o-mini',
      systemPrompt: 'sys',
      userPrompt: 'q',
      maxOutputTokens: 150,
      temperature: 0.4
    })
    expect(result).toBe('')
    expect(createSpy).toHaveBeenCalledTimes(1)
  })

  it('does NOT retry a permanent 400 bad-request error', async () => {
    const provider = new OpenAiProvider()
    vi.mocked(getOpenAIClient).mockReturnValue(makeFakeClient([
      { error: new APIError(400, undefined, 'bad request', undefined) }
    ]))
    const result = await provider.complete({
      model: 'gpt-4o-mini',
      systemPrompt: 'sys',
      userPrompt: 'q',
      maxOutputTokens: 150,
      temperature: 0.4
    })
    expect(result).toBe('')
  })

  it('returns empty string (skip) when retries are exhausted on a transient error', async () => {
    const provider = new OpenAiProvider()
    vi.mocked(getOpenAIClient).mockReturnValue(makeFakeClient([
      { error: new APIError(503, undefined, 'service unavailable', undefined) },
      { error: new APIError(502, undefined, 'bad gateway', undefined) }
    ]))
    const promise = provider.complete({
      model: 'gpt-4o-mini',
      systemPrompt: 'sys',
      userPrompt: 'q',
      maxOutputTokens: 150,
      temperature: 0.4
    })
    await vi.runAllTimersAsync()
    const result = await promise
    expect(result).toBe('')
  })

  it('never throws — a permanent failure yields an empty (skipped) response', async () => {
    const provider = new OpenAiProvider()
    vi.mocked(getOpenAIClient).mockReturnValue(makeFakeClient([
      { error: new APIError(403, undefined, 'content policy', undefined) }
    ]))
    await expect(provider.complete({
      model: 'gpt-4o-mini',
      systemPrompt: 'sys',
      userPrompt: 'q',
      maxOutputTokens: 150,
      temperature: 0.4
    })).resolves.toBe('')
  })
})

describe('isTransientError classification', () => {
  it('treats 429, 5xx, and network-less API errors as transient', () => {
    expect(isTransientError(new APIError(429, undefined, 'rate', undefined))).toBe(true)
    expect(isTransientError(new APIError(500, undefined, 'err', undefined))).toBe(true)
    expect(isTransientError(new APIError(503, undefined, 'err', undefined))).toBe(true)
    expect(isTransientError(new APIError(undefined, undefined, 'network', undefined))).toBe(true)
    expect(isTransientError(new APIError(408, undefined, 'timeout', undefined))).toBe(true)
  })

  it('treats 4xx auth / request errors as permanent', () => {
    expect(isTransientError(new APIError(401, undefined, 'unauth', undefined))).toBe(false)
    expect(isTransientError(new APIError(400, undefined, 'bad', undefined))).toBe(false)
    expect(isTransientError(new APIError(403, undefined, 'policy', undefined))).toBe(false)
  })

  it('classifies generic timeout/abort/network errors as transient', () => {
    const timeout = new Error('timeout')
    timeout.name = 'TimeoutError'
    expect(isTransientError(timeout)).toBe(true)
    expect(isTransientError(new Error('socket hang up'))).toBe(true)
    expect(isTransientError(new Error('ECONNRESET'))).toBe(true)
  })
})
