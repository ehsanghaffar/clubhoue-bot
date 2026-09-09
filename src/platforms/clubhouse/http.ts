/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { ClubhouseApiError, classifyHttpStatus, classifyNetworkError } from './errors.js'
import { withRetry, type RetryConfig } from './retry.js'

/**
 * The private API commonly returns a useful JSON error for a 4xx response.
 * Preserve a small, explicitly selected diagnostic so operators can fix a
 * bad room/session configuration without logging arbitrary response data.
 */
const responseDetail = async (response: Response): Promise<string | undefined> => {
  const raw = (await response.clone().text()).slice(0, 512).trim()
  if (raw === '') return undefined

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const candidate = parsed.message ?? parsed.error_message ?? parsed.error ?? parsed.detail
    if (typeof candidate === 'string' && candidate.trim() !== '') {
      return candidate.trim().replaceAll(/[\r\n\t]+/g, ' ').slice(0, 300)
    }
    return undefined
  } catch {
    // A non-JSON error page is not actionable and may contain sensitive
    // upstream details, so deliberately do not include it in logs.
    return undefined
  }
}

/**
 * Parses a `Retry-After` header. Supports both the HTTP-date form and the
 * common integer-seconds form used by rate-limit middlewares; degrade to
 * `undefined` when the value is unparseable rather than failing the call.
 */
export const parseRetryAfterMs = (value: string | null | undefined): number | undefined => {
  if (value == null || value.trim() === '') return undefined
  const trimmed = value.trim()
  const seconds = Number(trimmed)
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.round(seconds * 1000)
  }
  const httpDate = Date.parse(trimmed)
  if (Number.isFinite(httpDate)) {
    return Math.max(0, httpDate - Date.now())
  }
  return undefined
}

export const assertClubhouseResponse = async (
  operation: string,
  response: Response
): Promise<Response> => {
  if (response.ok) {
    return response
  }
  const status = response.status
  throw new ClubhouseApiError({
    operation,
    status,
    kind: classifyHttpStatus(status),
    message: await responseDetail(response),
    retryAfterMs: parseRetryAfterMs(response.headers.get('retry-after'))
  })
}

/**
 * Graceful JSON decoding: an empty or malformed body degrades to `{}` instead
 * of throwing, so a transient upstream oddity never takes down a room loop.
 */
export const parseJsonResponse = async <T> (response: Response): Promise<T> => {
  const raw = (await response.text()).trim()
  if (raw === '') {
    return {} as T
  }
  try {
    return JSON.parse(raw) as T
  } catch {
    return {} as T
  }
}

export interface ClubhouseCallOptions {
  retry?: RetryConfig
  /**
   * Optional hook run when an operation fails with an authentication error
   * (401/403). Implementations should refresh the credential and return `true`
   * when a replacement token is available; the original operation is then
   * retried once with the rotated token. Returning `false` (or throwing) keeps
   * the original auth error so callers can react via the existing
   * `authenticationFailure` path.
   */
  onAuthFailure?: () => Promise<boolean>
}

const emptyOptions: ClubhouseCallOptions = {}

export const wrapClubhouseCall = async <T> (
  operation: string,
  fn: () => Promise<Response>,
  parse: (response: Response) => Promise<T>,
  options: ClubhouseCallOptions = emptyOptions
): Promise<T> => {
  const runAttempt = async (attemptNumber: number): Promise<T> => {
    try {
      const response = await fn()
      await assertClubhouseResponse(operation, response)
      return await parse(response)
    } catch (error) {
      if (error instanceof ClubhouseApiError) {
        // A stale session token is worth one refresh + retry before surfacing
        // the auth failure. Consumes a retry budget slot to stay bounded.
        if (
          error.authenticationFailure &&
          options.onAuthFailure != null &&
          attemptNumber === 1
        ) {
          try {
            const refreshed = await options.onAuthFailure()
            if (refreshed) {
              return await runAttempt(2)
            }
          } catch {
            // Refresh itself failed; fall through to the original auth error.
          }
        }
        throw error
      }
      throw new ClubhouseApiError({
        operation,
        kind: classifyNetworkError(error)
      })
    }
  }

  return await withRetry(operation, runAttempt, options.retry)
}
