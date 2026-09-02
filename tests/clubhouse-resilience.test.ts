/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 *
 * Resilience pass: bounded retry/backoff, rate-limit (Retry-After) handling,
 * token refresh on auth failure, and graceful response degradation. All tests
 * are offline — they exercise the retry layer and the service against mocked
 * `Response` objects / a fake agent transport.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  computeBackoffMs,
  withRetry,
  DEFAULT_RETRY_CONFIG
} from '../src/platforms/clubhouse/retry.js'
import {
  wrapClubhouseCall,
  parseJsonResponse,
  parseRetryAfterMs
} from '../src/platforms/clubhouse/http.js'
import { ClubhouseApiError } from '../src/platforms/clubhouse/errors.js'
import { ClubApiService } from '../src/platforms/clubhouse/api.service.js'

const jsonResponse = (body: unknown, status = 200, headers: Record<string, string> = {}): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers }
  })

const parse = async <T> (response: Response): Promise<T> => await parseJsonResponse<T>(response)

describe('computeBackoffMs', () => {
  it('grows exponentially and honors the configured factor', () => {
    const config = { ...DEFAULT_RETRY_CONFIG, jitter: false, baseDelayMs: 500, factor: 2, maxDelayMs: 8000 }
    expect(computeBackoffMs(1, config)).toBe(500)
    expect(computeBackoffMs(2, config)).toBe(1000)
    expect(computeBackoffMs(3, config)).toBe(2000)
  })

  it('caps the delay at maxDelayMs', () => {
    const config = { ...DEFAULT_RETRY_CONFIG, jitter: false, baseDelayMs: 100, factor: 10, maxDelayMs: 250 }
    expect(computeBackoffMs(3, config)).toBe(250)
  })

  it('honors a server-provided Retry-After hint over the computed delay', () => {
    const config = { ...DEFAULT_RETRY_CONFIG, jitter: false, baseDelayMs: 100, maxDelayMs: 8000, maxRetryAfterMs: 5000 }
    expect(computeBackoffMs(1, config, 1000)).toBe(1000)
    expect(computeBackoffMs(1, config, 6000)).toBe(5000)
  })

  it('keeps the computed delay when no Retry-After is present', () => {
    const config = { ...DEFAULT_RETRY_CONFIG, jitter: false, baseDelayMs: 300 }
    expect(computeBackoffMs(1, config)).toBe(300)
  })
})

describe('parseRetryAfterMs', () => {
  it('parses integer seconds', () => {
    expect(parseRetryAfterMs('5')).toBe(5000)
    expect(parseRetryAfterMs(' 2 ')).toBe(2000)
  })

  it('parses an HTTP date', () => {
    const inTenSeconds = new Date(Date.now() + 10_000).toUTCString()
    const parsed = parseRetryAfterMs(inTenSeconds)
    expect(parsed).toBeGreaterThan(8_000)
    expect(parsed).toBeLessThanOrEqual(10_000)
  })

  it('degrades to undefined for unparseable values', () => {
    expect(parseRetryAfterMs('whenever')).toBeUndefined()
    expect(parseRetryAfterMs('')).toBeUndefined()
    expect(parseRetryAfterMs(null)).toBeUndefined()
  })
})

describe('wrapClubhouseCall retry behavior', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns the parsed body on success', async () => {
    const result = await wrapClubhouseCall('getChannels', async () => jsonResponse({ items: [1] }), parse<{ items: number[] }>)
    expect(result).toEqual({ items: [1] })
  })

  it('retries a transient 500 then succeeds', async () => {
    const fn = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ error_message: 'boom' }, 500))
      .mockResolvedValueOnce(jsonResponse({ items: [] }))

    const promise = wrapClubhouseCall('getChannels', fn, parse, { retry: { jitter: false, baseDelayMs: 100 } })
    await vi.runAllTimersAsync()
    const result = await promise

    expect(result).toEqual({ items: [] })
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('retries a rate-limited 429 and honors Retry-After', async () => {
    const fn = vi.fn()
      .mockResolvedValueOnce(jsonResponse({}, 429, { 'retry-after': '1' }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }))

    const promise = wrapClubhouseCall('sendMessage', fn, parse, {
      retry: { jitter: false, baseDelayMs: 100, maxRetryAfterMs: 5000, maxAttempts: 2 }
    })
    await vi.runAllTimersAsync()
    const result = await promise

    expect(result).toEqual({ ok: true })
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('does NOT retry a permanent 400 request error', async () => {
    const fn = vi.fn().mockResolvedValue(jsonResponse({ error_message: 'bad request' }, 400))

    await expect(wrapClubhouseCall('sendMessage', fn, parse)).rejects.toMatchObject({
      status: 400,
      kind: 'request',
      retryable: false
    })
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('surfaces the last typed error once retries are exhausted', async () => {
    const fn = vi.fn().mockResolvedValue(jsonResponse({}, 503))

    const promise = wrapClubhouseCall('getChannels', fn, parse, {
      retry: { jitter: false, baseDelayMs: 10, maxAttempts: 3 }
    })
    const expectation = expect(promise).rejects.toBeInstanceOf(ClubhouseApiError)
    await vi.runAllTimersAsync()

    await expectation
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('does not retry authentication errors on their own', async () => {
    const fn = vi.fn().mockResolvedValue(jsonResponse({}, 401))

    await expect(wrapClubhouseCall('getChannels', fn, parse)).rejects.toMatchObject({
      kind: 'authentication',
      authenticationFailure: true,
      retryable: false
    })
    expect(fn).toHaveBeenCalledTimes(1)
  })
})

describe('wrapClubhouseCall token refresh on auth failure', () => {
  it('refreshes once and retries with the rotated token', async () => {
    const fn = vi.fn()
      .mockResolvedValueOnce(jsonResponse({}, 401))
      .mockResolvedValueOnce(jsonResponse({ items: [] }))
    const onAuthFailure = vi.fn(async () => true)

    const result = await wrapClubhouseCall('getChannels', fn, parse, { onAuthFailure })

    expect(result).toEqual({ items: [] })
    expect(onAuthFailure).toHaveBeenCalledOnce()
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('keeps the original auth error when refresh declines', async () => {
    const fn = vi.fn().mockResolvedValue(jsonResponse({}, 401))
    const onAuthFailure = vi.fn(async () => false)

    await expect(wrapClubhouseCall('getChannels', fn, parse, { onAuthFailure })).rejects.toMatchObject({
      kind: 'authentication'
    })
    expect(fn).toHaveBeenCalledTimes(1)
  })
})

describe('graceful response degradation', () => {
  it('decodes an empty body to an empty object', async () => {
    const response = new Response('', { status: 200 })
    expect(await parseJsonResponse(response)).toEqual({})
  })

  it('decodes a malformed body to an empty object instead of throwing', async () => {
    const response = new Response('<html>not json</html>', { status: 200 })
    expect(await parseJsonResponse(response)).toEqual({})
  })

  it('returns an empty object through wrapClubhouseCall for an empty 2xx body', async () => {
    const result = await wrapClubhouseCall('leaveChannel', async () => new Response('', { status: 200 }), parse)
    expect(result).toEqual({})
  })
})

describe('ClubApiService token refresh', () => {
  const agentFor = (handler: (url: string, options?: { body?: Record<string, unknown> }, customs?: { token?: string }) => Promise<Response>): typeof handler & { mock: ReturnType<typeof vi.fn> } =>
    vi.fn(handler)

  it('refreshes the access token via POST /refresh_token and notifies the owner', async () => {
    const agent = agentFor(async (url, options) => {
      if (url === '/refresh_token') {
        expect(options?.body).toEqual({ refresh_token: 'rt-1' })
        return jsonResponse({ access_token: 'tok-new' })
      }
      throw new Error(`unexpected url ${url}`)
    })
    const profile = { token: 'tok-old', refreshToken: 'rt-1' }
    const onTokenRefreshed = vi.fn()
    const service = new ClubApiService(profile, agent, { onTokenRefreshed })

    const token = await service.refreshAccessToken()

    expect(token).toBe('tok-new')
    expect(profile.token).toBe('tok-new')
    expect(onTokenRefreshed).toHaveBeenCalledWith('tok-new')
  })

  it('returns null when no refresh token is configured', async () => {
    const agent = agentFor(async () => jsonResponse({ access_token: 'x' }))
    const service = new ClubApiService({ token: 'tok-old' }, agent)

    expect(await service.refreshAccessToken()).toBeNull()
    expect(agent).not.toHaveBeenCalled()
  })

  it('tolerates a refresh response that omits the token', async () => {
    const agent = agentFor(async () => jsonResponse({ success: true }))
    const service = new ClubApiService({ token: 'tok-old', refreshToken: 'rt-1' }, agent)

    expect(await service.refreshAccessToken()).toBeNull()
    expect(agent).toHaveBeenCalledWith(
      '/refresh_token',
      expect.objectContaining({ body: { refresh_token: 'rt-1' } }),
      expect.anything()
    )
  })

  it('recovers from an expired session by refreshing and retrying the operation', async () => {
    let channelCalls = 0
    let refreshCalls = 0
    const agent = agentFor(async (url, _options, customs) => {
      if (url === '/get_feed_v3?get_unconnected_rooms=true') {
        channelCalls += 1
        if (channelCalls === 1) {
          expect(customs?.token).toBe('tok-expired')
          return jsonResponse({}, 401)
        }
        expect(customs?.token).toBe('tok-new')
        return jsonResponse({ items: [] })
      }
      if (url === '/refresh_token') {
        refreshCalls += 1
        return jsonResponse({ access_token: 'tok-new' })
      }
      throw new Error(`unexpected url ${url}`)
    })

    const service = new ClubApiService({ token: 'tok-expired', refreshToken: 'rt-1' }, agent)
    const channels = await service.getChannels()

    expect(channels).toEqual({ items: [] })
    expect(channelCalls).toBe(2)
    expect(refreshCalls).toBe(1)
  })

  it('surfaces the auth error when refresh cannot recover the session', async () => {
    const agent = agentFor(async (url) => {
      if (url === '/refresh_token') {
        return jsonResponse({ success: false })
      }
      return jsonResponse({}, 401)
    })

    const service = new ClubApiService({ token: 'tok-expired', refreshToken: 'rt-1' }, agent, {
      retry: { jitter: false, baseDelayMs: 10 }
    })

    await expect(service.getChannels()).rejects.toMatchObject({
      kind: 'authentication',
      authenticationFailure: true
    })
  })

  it('surfaces the auth error when no refresh token is available', async () => {
    const agent = agentFor(async () => jsonResponse({}, 401))

    const service = new ClubApiService({ token: 'tok-expired' }, agent)

    await expect(service.getChannels()).rejects.toMatchObject({
      kind: 'authentication',
      authenticationFailure: true
    })
  })
})

describe('withRetry primitive', () => {
  it('rethrows non-ClubhouseApi errors immediately', async () => {
    const boom = new Error('parser bug')
    await expect(withRetry('get', async () => { throw boom })).rejects.toBe(boom)
  })
})