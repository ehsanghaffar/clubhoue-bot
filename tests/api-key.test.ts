/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { describe, it, expect, afterEach } from 'vitest'
import express from 'express'
import type { AddressInfo } from 'net'
import requireApiKey from '../src/middlewares/api-key.js'
import { errorHandler } from '../src/middlewares/error-handler.js'

const apiKey = 'test-api-key-123'

const buildHarness = (): ReturnType<typeof express> => {
  const app = express()
  app.use('/api', requireApiKey)
  app.get('/api/ping', (_req, res) => {
    res.json({ ok: true })
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

describe('requireApiKey', () => {
  afterEach(() => {
    delete process.env.API_KEY
  })

  it('allows requests with the correct x-api-key header', async () => {
    process.env.API_KEY = apiKey
    const app = buildHarness()
    const server = await startServer(app)
    try {
      const res = await fetch(`http://127.0.0.1:${server.port}/api/ping`, {
        headers: { 'x-api-key': apiKey }
      })
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ ok: true })
    } finally {
      await server.close()
    }
  })

  it('rejects requests without an API key header', async () => {
    process.env.API_KEY = apiKey
    const app = buildHarness()
    const server = await startServer(app)
    try {
      const res = await fetch(`http://127.0.0.1:${server.port}/api/ping`)
      expect(res.status).toBe(401)
      const body = (await res.json()) as { error: { type: string } }
      expect(body.error.type).toBe('UNAUTHORIZED')
    } finally {
      await server.close()
    }
  })

  it('rejects requests with a wrong API key', async () => {
    process.env.API_KEY = apiKey
    const app = buildHarness()
    const server = await startServer(app)
    try {
      const res = await fetch(`http://127.0.0.1:${server.port}/api/ping`, {
        headers: { 'x-api-key': 'wrong-key' }
      })
      expect(res.status).toBe(401)
    } finally {
      await server.close()
    }
  })

  it('fails closed when API_KEY env var is not configured', async () => {
    delete process.env.API_KEY
    const app = buildHarness()
    const server = await startServer(app)
    try {
      const res = await fetch(`http://127.0.0.1:${server.port}/api/ping`, {
        headers: { 'x-api-key': apiKey }
      })
      expect(res.status).toBe(500)
    } finally {
      await server.close()
    }
  })
})