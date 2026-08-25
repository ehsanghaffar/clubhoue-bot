/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { ClubhouseApiError, classifyHttpStatus, classifyNetworkError } from './errors.js'

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
    message: await responseDetail(response)
  })
}

export const wrapClubhouseCall = async <T>(
  operation: string,
  fn: () => Promise<Response>,
  parse: (response: Response) => Promise<T>
): Promise<T> => {
  try {
    const response = await fn()
    await assertClubhouseResponse(operation, response)
    return await parse(response)
  } catch (error) {
    if (error instanceof ClubhouseApiError) {
      throw error
    }
    throw new ClubhouseApiError({
      operation,
      kind: classifyNetworkError(error)
    })
  }
}
