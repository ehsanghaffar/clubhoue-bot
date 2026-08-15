/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { ClubhouseApiError, classifyHttpStatus, classifyNetworkError } from './errors.js'

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
    kind: classifyHttpStatus(status)
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
