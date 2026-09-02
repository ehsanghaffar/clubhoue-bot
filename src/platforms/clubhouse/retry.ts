/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { ClubhouseApiError } from './errors.js'
import logger from '../../utils/logger.js'

/**
 * Retry policy for Clubhouse private-API calls. Kept small so a degraded or
 * rate-limited endpoint can never stall the room loop for more than a few
 * seconds; retries for `Retry-After` are honored up to `maxRetryAfterMs`.
 */
export interface RetryConfig {
  /** Total number of attempts including the first one (default 3). */
  maxAttempts?: number
  /** Backoff delay for the first retry in ms (default 500). */
  baseDelayMs?: number
  /** Hard cap on the exponential delay in ms (default 8s). */
  maxDelayMs?: number
  /** Multiplier applied to the delay each retry (default 2). */
  factor?: number
  /** Apply full jitter to the computed delay (default true). */
  jitter?: boolean
  /** Ceiling applied to a server-provided `Retry-After` in ms (default 30s). */
  maxRetryAfterMs?: number
}

export const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxAttempts: 3,
  baseDelayMs: 500,
  maxDelayMs: 8_000,
  factor: 2,
  jitter: true,
  maxRetryAfterMs: 30_000
}

const sleep = async (ms: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Computes the backoff delay for a retry. Exponential (`base * factor^(n-1)`)
 * capped at `maxDelayMs`, with optional full jitter. When the upstream reports
 * a `Retry-After` for the failed attempt, that hint wins (clamped to
 * `maxRetryAfterMs`) so rate-limit responses are respected.
 */
export const computeBackoffMs = (
  attempt: number,
  config: Required<RetryConfig> = DEFAULT_RETRY_CONFIG,
  retryAfterMs?: number
): number => {
  const exponential = config.baseDelayMs * Math.pow(config.factor, attempt - 1)
  const cap = Math.min(exponential, config.maxDelayMs)
  const jittered = config.jitter ? Math.random() * cap : cap
  const delay = Math.max(1, Math.round(jittered))
  if (retryAfterMs != null && retryAfterMs > 0) {
    return Math.max(delay, Math.min(Math.round(retryAfterMs), config.maxRetryAfterMs))
  }
  return delay
}

/**
 * Runs an operation with bounded retry for transient `ClubhouseApiError`s
 * (rate-limited, 5xx, timeouts, network). Permanent errors and exhausted
 * retries re-throw the last typed error so callers keep working with the
 * existing `retryable`/`rateLimited`/`authenticationFailure` semantics.
 */
export const withRetry = async <T> (
  operation: string,
  attempt: (attemptNumber: number) => Promise<T>,
  options?: RetryConfig
): Promise<T> => {
  const config: Required<RetryConfig> = { ...DEFAULT_RETRY_CONFIG, ...options }
  let lastError: unknown

  for (let attemptNumber = 1; attemptNumber <= config.maxAttempts; attemptNumber++) {
    try {
      return await attempt(attemptNumber)
    } catch (error) {
      lastError = error
      if (!(error instanceof ClubhouseApiError)) {
        throw error
      }
      if (!error.retryable || attemptNumber >= config.maxAttempts) {
        throw error
      }
      const delayMs = computeBackoffMs(attemptNumber, config, error.retryAfterMs)
      logger.debug(`Clubhouse ${operation} transient failure, retrying`, {
        attempt: attemptNumber,
        maxAttempts: config.maxAttempts,
        kind: error.kind,
        status: error.status,
        retryAfterMs: error.retryAfterMs,
        delayMs
      })
      await sleep(delayMs)
    }
  }

  throw lastError
}
