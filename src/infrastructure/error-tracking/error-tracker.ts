/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { randomUUID } from 'node:crypto'
import logger from '../../utils/logger.js'
import { AppError } from '../../utils/errors.js'
import type { RequestContext } from '../../utils/request-context.js'

export interface ErrorReport {
  requestId?: string
  method?: string
  path?: string
  context?: Record<string, unknown>
  error: unknown
}

export interface ErrorEvent {
  eventId: string
  service: string
  environment: string
  code: string
  message: string
  stack?: string
  operational: boolean
  requestId?: string
  method?: string
  path?: string
  context?: Record<string, unknown>
  occurredAt: string
}

export type TrackFn = (event: ErrorEvent) => void

const transports: Array<{ name: string, track: TrackFn }> = []

/**
 * Registers an external error-tracking transport (e.g. Sentry, Datadog).
 * `reportError` fans the event out to every registered transport after the
 * local structured log, so swapping in a hosted tracker later is a one-line
 * registration rather than a code change across the app.
 */
export const registerErrorTransport = (name: string, track: TrackFn): void => {
  transports.push({ name, track })
}

const normalize = (error: unknown): { message: string, stack?: string, code: string } => {
  if (error instanceof AppError) {
    return {
      message: error.message,
      stack: error.stack,
      code: error.type
    }
  }
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      code: (error as Error & { code?: string | number }).code
        ? String((error as Error & { code?: string | number }).code)
        : 'UNCAUGHT_ERROR'
    }
  }
  return { message: String(error), code: 'UNCAUGHT_ERROR' }
}

/**
 * Central error-tracking choke point. Every backend failure that should
 * surface before it reaches the user flows through here: unexpected 5xx
 * request errors, unhandled promise rejections and uncaught exceptions.
 *
 * The event is always written to the structured `error` log (and therefore the
 * `logs/error.log` transport) and fanned out to any registered error-tracking
 * transports.
 */
export const reportError = (report: ErrorReport): ErrorEvent => {
  const { message, stack, code } = normalize(report.error)
  const event: ErrorEvent = {
    eventId: randomUUID(),
    service: 'clubhouse-bot',
    environment: process.env.NODE_ENV ?? 'development',
    code,
    message,
    stack,
    operational: report.error instanceof AppError,
    requestId: report.requestId,
    method: report.method,
    path: report.path,
    context: report.context,
    occurredAt: new Date().toISOString()
  }

  logger.error(`[${code}] ${message}`, {
    errorEvent: event
  })

  for (const transport of transports) {
    try {
      transport.track(event)
    } catch (err) {
      logger.error(`Error tracking transport "${transport.name}" failed`, { error: err })
    }
  }

  return event
}

/** Convenience wrapper that attaches an active request's context to an error. */
export const reportRequestError = (
  requestContext: RequestContext,
  error: unknown,
  context?: Record<string, unknown>
): ErrorEvent =>
  reportError({
    requestId: requestContext.requestId,
    method: requestContext.method,
    path: requestContext.path,
    context,
    error
  })

export default { reportError, reportRequestError, registerErrorTransport }
