/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { randomUUID } from 'node:crypto'
import type { Request } from 'express'

export const REQUEST_ID_HEADER = 'x-request-id'

export interface RequestContext {
  requestId: string
  method: string
  path: string
  ip?: string
  userAgent?: string
}

export const newRequestId = (): string => randomUUID()

/**
 * Builds the structured context used by the request logger and the error
 * tracker so a failure can always be correlated back to the exact request that
 * triggered it (and, via `requestId`, up- or down-stream in logs).
 */
export const buildRequestContext = (req: Request): RequestContext => {
  const requestId =
    req.get(REQUEST_ID_HEADER) ?? newRequestId()

  return {
    requestId,
    method: req.method,
    path: req.originalUrl ?? req.path ?? '',
    ip: req.ip,
    userAgent: req.get('user-agent')
  }
}

export default { REQUEST_ID_HEADER, newRequestId, buildRequestContext }
