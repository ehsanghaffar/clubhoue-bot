/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { type Request, type Response, type NextFunction } from 'express'
import logger from '../utils/logger.js'
import { buildRequestContext, REQUEST_ID_HEADER } from '../utils/request-context.js'

/**
 * Structured HTTP request logging. Generates (or reuses) a request id, echoes
 * it on the `X-Request-Id` response header, and emits one log line per request
 * with method, path, status and duration so failures are visible at a glance
 * and can be correlated to the requesting tenant/client.
 *
 * 5xx responses are logged at `error` level; everything else at `info`.
 */
export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const context = buildRequestContext(req)
  const startedAt = process.hrtime.bigint()

  res.setHeader(REQUEST_ID_HEADER, context.requestId)
  res.setHeader('X-Powered-By', 'clubhouse-bot')

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6
    const statusCode = res.statusCode
    const log = {
      requestId: context.requestId,
      method: context.method,
      path: context.path,
      statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
      ip: context.ip
    }

    if (statusCode >= 500) {
      logger.error('Request failed', log)
    } else {
      logger.info('Request completed', log)
    }
  })

  next()
}

export default requestLogger
