/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type OpenAI from 'openai'
import { APIError } from 'openai'
import type { AiCompleteRequest, AiProvider } from './ai.types.js'
import { getOpenAIClient } from '../../services/openai.service.js'
import logger from '../../utils/logger.js'

/** Hard ceiling so a single AI request can never hang the room loop. */
const REQUEST_TIMEOUT_MS = 25_000
/** Bounded retries: attempt 1, backoff, attempt 2 — then give up. */
const MAX_ATTEMPTS = 2
const RETRY_BASE_DELAY_MS = 1_000

/**
 * Classifies an OpenAI error as transient (safe to retry) or permanent.
 * Transient: network/timeouts, 429 rate-limit, 5xx server errors.
 * Permanent: 4xx auth / request / policy errors (retrying wastes time).
 */
export const isTransientError = (error: unknown): boolean => {
  if (error instanceof APIError) {
    const status = error.status
    if (status == null) {
      return true
    }
    if (status === 429) {
      return true
    }
    if (status >= 500 && status < 600) {
      return true
    }
    if (status === 408) {
      return true
    }
    return false
  }
  if (error instanceof Error) {
    const name = error.name
    if (name === 'TimeoutError' || name === 'AbortError') {
      return true
    }
    const message = error.message.toLowerCase()
    if (message.includes('timeout') || message.includes('econnreset') || message.includes('socket') || message.includes('network')) {
      return true
    }
  }
  return false
}

const delay = async (ms: number): Promise<void> => { await new Promise((resolve) => setTimeout(resolve, ms)) }

/**
 * OpenAI-backed AI provider with an explicit timeout and bounded transient
 * retry. The SDK client is created lazily on first call so importing this
 * module never fails at boot (OPENAI_API_KEY is validated by the server
 * bootstrap).
 */
export class OpenAiProvider implements AiProvider {
  private client: OpenAI | null = null

  private getClient (): OpenAI {
    if (this.client == null) {
      this.client = getOpenAIClient()
    }
    return this.client
  }

  async complete (request: AiCompleteRequest): Promise<string> {
    let lastError: unknown

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const result = await this.getClient().chat.completions.create({
          model: request.model,
          messages: [
            { role: 'system', content: request.systemPrompt },
            { role: 'user', content: request.userPrompt }
          ],
          max_tokens: request.maxOutputTokens,
          temperature: request.temperature
        }, { timeout: REQUEST_TIMEOUT_MS })
        return result.choices[0]?.message?.content ?? ''
      } catch (error) {
        lastError = error
        const transient = isTransientError(error)
        const status = error instanceof APIError ? error.status : undefined
        // Never log the API key or full prompt — only a safe classification.
        logger.error('AI request failed', {
          attempt,
          maxAttempts: MAX_ATTEMPTS,
          transient,
          status,
          retryable: transient && attempt < MAX_ATTEMPTS
        })

        if (transient && attempt < MAX_ATTEMPTS) {
          await delay(RETRY_BASE_DELAY_MS * attempt)
          continue
        }
        break
      }
    }

    // All attempts exhausted (or a permanent error). The room loop treats a
    // null response as "skip" — never crash the loop on an AI failure.
    logger.error('AI request exhausted retries or permanent failure', {
      maxAttempts: MAX_ATTEMPTS,
      permanent: !isTransientError(lastError)
    })
    return ''
  }
}
