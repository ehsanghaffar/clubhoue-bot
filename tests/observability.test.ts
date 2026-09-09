/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { describe, it, expect } from 'vitest'
import express, { type NextFunction, type Request, type Response } from 'express'
import type { AddressInfo } from 'net'
import { requestLogger } from '../src/middlewares/request-logger.js'
import { REQUEST_ID_HEADER } from '../src/utils/request-context.js'
import {
  registerErrorTransport,
  reportError
} from '../src/infrastructure/error-tracking/error-tracker.js'

describe('observability baseline', () => {
  it('attaches an X-Request-Id header and headers to responses', async () => {
    const app = express()
    app.use(requestLogger)
    app.get('/ping', (_req: Request, res: Response) => {
      res.json({ ok: true })
    })

    const server = app.listen(0)
    await new Promise<void>((resolve) => server.once('listening', resolve))
    const port = (server.address() as AddressInfo).port
    try {
      const res = await fetch(`http://127.0.0.1:${port}/ping`)
      expect(res.status).toBe(200)
      expect(res.headers.get(REQUEST_ID_HEADER)).toBeTruthy()
    } finally {
      await server.close()
    }
  })

  it('reuses an incoming X-Request-Id correlation id', async () => {
    const app = express()
    app.use(requestLogger)
    app.get('/ping', (_req: Request, res: Response) => {
      res.json({ ok: true })
    })

    const server = app.listen(0)
    await new Promise<void>((resolve) => server.once('listening', resolve))
    const port = (server.address() as AddressInfo).port
    try {
      const correlationId = 'corr-123'
      const res = await fetch(`http://127.0.0.1:${port}/ping`, {
        headers: { [REQUEST_ID_HEADER]: correlationId }
      })
      expect(res.headers.get(REQUEST_ID_HEADER)).toBe(correlationId)
    } finally {
      await server.close()
    }
  })

  it('reportError emits a structured event and fans out to registered transports', () => {
    const seen: unknown[] = []
    registerErrorTransport('test', (event) => {
      seen.push(event)
    })

    const result = reportError({
      error: new Error('boom'),
      requestId: 'req-1',
      method: 'GET',
      path: '/v1/test'
    })

    expect(result.code).toBe('UNCAUGHT_ERROR')
    expect(result.message).toBe('boom')
    expect(result.requestId).toBe('req-1')
    expect(seen.length).toBe(1)
  })

  it('error handler still normalizes ordinary errors without an active request logger', async () => {
    const { errorHandler } = await import('../src/middlewares/error-handler.js')
    const app = express()
    app.get('/boom', (_req: Request, _res: Response, next: NextFunction) => {
      next(new Error('unexpected'))
    })
    app.use(errorHandler)

    process.env.NODE_ENV = 'production'
    const server = app.listen(0)
    await new Promise<void>((resolve) => server.once('listening', resolve))
    const port = (server.address() as AddressInfo).port
    try {
      const res = await fetch(`http://127.0.0.1:${port}/boom`)
      expect(res.status).toBe(500)
      const body = (await res.json()) as { error: { message: string } }
      expect(body.error.message).toBe('An unexpected error occurred.')
    } finally {
      await server.close()
      delete process.env.NODE_ENV
    }
  })
})
