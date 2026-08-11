/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { describe, it, expect } from 'vitest'
import express, { NextFunction, Request, Response } from 'express'
import rateLimit from 'express-rate-limit'
import type { AddressInfo } from 'net'
import { errorHandler } from '../src/middlewares/error-handler.js'
import { AppError, ERROR_TYPES } from '../src/utils/errors.js'

describe('errorHandler', () => {
  const buildHarness = (): ReturnType<typeof express> => {
    const app = express()
    app.get('/boom', (_req: Request, _res: Response, next: NextFunction) => {
      next(new AppError(ERROR_TYPES.VALIDATION, 400, 'Bad input'))
    })
    app.get('/duplicate', (_req: Request, _res: Response, next: NextFunction) => {
      const err = new Error('E11000 duplicate key') as Error & { code: number }
      err.code = 11000
      next(err)
    })
    app.get('/internal', (_req: Request, _res: Response, next: NextFunction) => {
      next(new Error('boom'))
    })
    app.use(errorHandler)
    return app
  }

  const startServer = async (app: ReturnType<typeof express>): Promise<{ port: number, close: () => Promise<void> }> => {
    const server = app.listen(0)
    await new Promise<void>((resolve) => server.once('listening', resolve))
    const port = (server.address() as AddressInfo).port
    return {
      port,
      close: () => new Promise<void>((resolve) => server.close(() => resolve()))
    }
  }

  it('normalizes AppError to its status code and type', async () => {
    const app = buildHarness()
    const server = await startServer(app)
    try {
      const res = await fetch(`http://127.0.0.1:${server.port}/boom`)
      expect(res.status).toBe(400)
      const body = (await res.json()) as { error: { type: string, message: string } }
      expect(body.error.type).toBe('VALIDATION_ERROR')
      expect(body.error.message).toBe('Bad input')
    } finally {
      await server.close()
    }
  })

  it('maps duplicate-key errors (code 11000) to 409', async () => {
    const app = buildHarness()
    const server = await startServer(app)
    try {
      const res = await fetch(`http://127.0.0.1:${server.port}/duplicate`)
      expect(res.status).toBe(409)
      const body = (await res.json()) as { error: { type: string } }
      expect(body.error.type).toBe('DUPLICATE_ERROR')
    } finally {
      await server.close()
    }
  })

  it('returns 500 with a generic message in production', async () => {
    process.env.NODE_ENV = 'production'
    const app = buildHarness()
    const server = await startServer(app)
    try {
      const res = await fetch(`http://127.0.0.1:${server.port}/internal`)
      expect(res.status).toBe(500)
      const body = (await res.json()) as { error: { message: string } }
      expect(body.error.message).toBe('An unexpected error occurred.')
    } finally {
      await server.close()
      delete process.env.NODE_ENV
    }
  })
})

describe('rate limiting', () => {
  it('returns 429 once the limit is exceeded', async () => {
    const app = express()
    app.use(
      rateLimit({
        windowMs: 60 * 1000,
        limit: 2,
        standardHeaders: 'draft-7',
        legacyHeaders: false
      })
    )
    app.get('/ping', (_req, res) => {
      res.json({ ok: true })
    })
    const server = app.listen(0)
    await new Promise<void>((resolve) => server.once('listening', resolve))
    const port = (server.address() as AddressInfo).port
    try {
      const first = await fetch(`http://127.0.0.1:${port}/ping`)
      const second = await fetch(`http://127.0.0.1:${port}/ping`)
      const third = await fetch(`http://127.0.0.1:${port}/ping`)
      expect(first.status).toBe(200)
      expect(second.status).toBe(200)
      expect(third.status).toBe(429)
    } finally {
      await server.close()
    }
  })
})