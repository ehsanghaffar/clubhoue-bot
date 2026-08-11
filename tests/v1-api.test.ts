/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import express from 'express'
import type { AddressInfo } from 'net'
import { createApp } from '../src/app.js'
import { TenantService } from '../src/core/tenants/tenant.service.js'
import { CredentialService } from '../src/core/credentials/credential.service.js'
import { BotService } from '../src/core/bots/bot.service.js'
import { BotManager } from '../src/core/bots/bot-manager.js'
import { RoomService } from '../src/core/rooms/room.service.js'
import { UsageService } from '../src/core/usage/usage.service.js'
import { AnalyticsService } from '../src/core/usage/analytics.service.js'
import { EventBus } from '../src/core/events/event-bus.js'
import { InMemoryMessageDeduplicator } from '../src/infrastructure/deduplication/message-dedup.js'
import {
  InMemoryBotRepository,
  InMemoryRoomRepository,
  InMemoryRoomMemberRepository,
  InMemoryCredentialRepository,
  InMemoryUsageRepository,
  InMemoryTenantRepository
} from './helpers/in-memory.js'

const tenantAKey = 'key-tenant-a'
const tenantBKey = 'key-tenant-b'

const startServer = async (app: ReturnType<typeof express>): Promise<{ port: number, close: () => Promise<void> }> => {
  const server = app.listen(0)
  await new Promise<void>((resolve) => server.once('listening', resolve))
  const port = (server.address() as AddressInfo).port
  return {
    port,
    close: () => new Promise<void>((resolve) => server.close(() => resolve()))
  }
}

describe('v1 API', () => {
  let app: ReturnType<typeof express>
  let server: { port: number, close: () => Promise<void> }
  let botRepo: InMemoryBotRepository
  let roomRepo: InMemoryRoomRepository
  let usageRepo: InMemoryUsageRepository

  beforeEach(async () => {
    const tenantRepo = new InMemoryTenantRepository()
    await tenantRepo.create({ name: 'Tenant A', apiKeys: [tenantAKey] })
    await tenantRepo.create({ name: 'Tenant B', apiKeys: [tenantBKey] })
    const tenantSvc = new TenantService(tenantRepo)

    botRepo = new InMemoryBotRepository()
    roomRepo = new InMemoryRoomRepository()
    const memberRepo = new InMemoryRoomMemberRepository()
    usageRepo = new InMemoryUsageRepository()
    const credentialRepo = new InMemoryCredentialRepository()
    const bus = new EventBus()

    const credentialService = new CredentialService(credentialRepo)
    const botService = new BotService({ repo: botRepo, credentials: credentialService })
    const roomService = new RoomService({
      repo: roomRepo,
      members: memberRepo,
      deduplicator: new InMemoryMessageDeduplicator(),
      bus
    })
    const botManager = new BotManager({ bots: botRepo, rooms: roomRepo, roomService, botService })
    const usageService = new UsageService({ repo: usageRepo })
    const analyticsService = new AnalyticsService({ usage: usageRepo, rooms: roomRepo, members: memberRepo })

    app = createApp({
      botService,
      botManager,
      credentialService,
      roomService,
      usageService,
      analyticsService,
      tenantService: tenantSvc
    })
    server = await startServer(app)
  })

  afterEach(async () => {
    await server.close()
  })

  const api = (path: string): string => `http://127.0.0.1:${server.port}${path}`
  const headers = (key: string): Record<string, string> => ({
    'content-type': 'application/json',
    'x-api-key': key
  })

  const createBot = async (key = tenantAKey, overrides: Record<string, unknown> = {}): Promise<string> => {
    const res = await fetch(api('/v1/bots'), {
      method: 'POST',
      headers: headers(key),
      body: JSON.stringify({ name: 'Helper', platform: 'clubhouse', ...overrides })
    })
    expect(res.status).toBe(201)
    const body = (await res.json()) as { data: { id: string } }
    return body.data.id
  }

  describe('authentication', () => {
    it('rejects requests without an API key', async () => {
      const res = await fetch(api('/v1/bots'))
      expect(res.status).toBe(401)
    })

    it('rejects requests with an invalid API key', async () => {
      const res = await fetch(api('/v1/bots'), { headers: headers('nope') })
      expect(res.status).toBe(401)
      const body = (await res.json()) as { error: { type: string } }
      expect(body.error.type).toBe('UNAUTHORIZED')
    })
  })

  describe('bots', () => {
    it('creates, lists, gets, patches and deletes a bot', async () => {
      const botId = await createBot()

      const list = await fetch(api('/v1/bots'), { headers: headers(tenantAKey) })
      expect(list.status).toBe(200)
      const listBody = (await list.json()) as { data: Array<{ id: string, name: string }> }
      expect(listBody.data).toHaveLength(1)
      expect(listBody.data[0].name).toBe('Helper')

      const get = await fetch(api(`/v1/bots/${botId}`), { headers: headers(tenantAKey) })
      expect(get.status).toBe(200)
      const getBody = (await get.json()) as { data: { id: string, status: string } }
      expect(getBody.data.id).toBe(botId)
      expect(getBody.data.status).toBe('created')

      // Partial aiConfig patch merges with the existing config.
      const patch = await fetch(api(`/v1/bots/${botId}`), {
        method: 'PATCH',
        headers: headers(tenantAKey),
        body: JSON.stringify({ aiConfig: { temperature: 0.9 } })
      })
      expect(patch.status).toBe(200)
      const patchBody = (await patch.json()) as { data: { aiConfig: { enabled: boolean, temperature: number, model: string } } }
      expect(patchBody.data.aiConfig.temperature).toBe(0.9)
      expect(patchBody.data.aiConfig.enabled).toBe(true)
      expect(patchBody.data.aiConfig.model).toBe('gpt-4o-mini')

      const del = await fetch(api(`/v1/bots/${botId}`), { method: 'DELETE', headers: headers(tenantAKey) })
      expect(del.status).toBe(204)

      const gone = await fetch(api(`/v1/bots/${botId}`), { headers: headers(tenantAKey) })
      expect(gone.status).toBe(404)
    })

    it('returns 400 when the request body is invalid', async () => {
      const res = await fetch(api('/v1/bots'), {
        method: 'POST',
        headers: headers(tenantAKey),
        body: JSON.stringify({ name: '' })
      })
      expect(res.status).toBe(400)
      const body = (await res.json()) as { error: { type: string } }
      expect(body.error.type).toBe('VALIDATION_ERROR')
    })

    it('does not leak bots across tenants', async () => {
      await createBot(tenantAKey)

      const list = await fetch(api('/v1/bots'), { headers: headers(tenantBKey) })
      expect(list.status).toBe(200)
      const listBody = (await list.json()) as { data: unknown[] }
      expect(listBody.data).toHaveLength(0)
    })

    it('returns 404 for another tenant\u2019s bot', async () => {
      const botId = await createBot(tenantAKey)
      const res = await fetch(api(`/v1/bots/${botId}`), { headers: headers(tenantBKey) })
      expect(res.status).toBe(404)
    })
  })

  describe('credentials', () => {
    it('creates and lists credentials without exposing ciphertext', async () => {
      const botId = await createBot()

      const create = await fetch(api(`/v1/bots/${botId}/credentials`), {
        method: 'POST',
        headers: headers(tenantAKey),
        body: JSON.stringify({ token: 'secret-token', deviceId: 'dev-1' })
      })
      expect(create.status).toBe(201)
      const createBody = (await create.json()) as { data: Record<string, unknown> }
      expect(createBody.data.encryptedToken).toBeUndefined()
      expect(createBody.data.status).toBe('active')

      const list = await fetch(api(`/v1/bots/${botId}/credentials`), { headers: headers(tenantAKey) })
      expect(list.status).toBe(200)
      const listBody = (await list.json()) as { data: Array<Record<string, unknown>> }
      expect(listBody.data).toHaveLength(1)
      expect(listBody.data[0].encryptedToken).toBeUndefined()
    })

    it('returns 400 for a credential without a token', async () => {
      const botId = await createBot()
      const res = await fetch(api(`/v1/bots/${botId}/credentials`), {
        method: 'POST',
        headers: headers(tenantAKey),
        body: JSON.stringify({ deviceId: 'dev-1' })
      })
      expect(res.status).toBe(400)
    })

    it('deletes a credential', async () => {
      const botId = await createBot()
      const create = await fetch(api(`/v1/bots/${botId}/credentials`), {
        method: 'POST',
        headers: headers(tenantAKey),
        body: JSON.stringify({ token: 'secret-token' })
      })
      const createBody = (await create.json()) as { data: { id: string } }

      const del = await fetch(api(`/v1/bots/${botId}/credentials/${createBody.data.id}`), {
        method: 'DELETE',
        headers: headers(tenantAKey)
      })
      expect(del.status).toBe(204)

      const list = await fetch(api(`/v1/bots/${botId}/credentials`), { headers: headers(tenantAKey) })
      const listBody = (await list.json()) as { data: unknown[] }
      expect(listBody.data).toHaveLength(0)
    })
  })

  describe('rooms', () => {
    it('creates, lists and gets rooms for a bot', async () => {
      const botId = await createBot()

      const create = await fetch(api(`/v1/bots/${botId}/rooms`), {
        method: 'POST',
        headers: headers(tenantAKey),
        body: JSON.stringify({ externalRoomId: 'ch_room_1' })
      })
      expect(create.status).toBe(201)
      const createBody = (await create.json()) as { data: { id: string, status: string } }
      expect(createBody.data.status).toBe('configured')

      const list = await fetch(api(`/v1/bots/${botId}/rooms`), { headers: headers(tenantAKey) })
      expect(list.status).toBe(200)
      const listBody = (await list.json()) as { data: Array<{ id: string }> }
      expect(listBody.data).toHaveLength(1)

      const get = await fetch(api(`/v1/bots/${botId}/rooms/${createBody.data.id}`), { headers: headers(tenantAKey) })
      expect(get.status).toBe(200)
      const getBody = (await get.json()) as { data: { id: string } }
      expect(getBody.data.id).toBe(createBody.data.id)
    })

    it('returns 404 for a room that does not exist', async () => {
      const botId = await createBot()
      const res = await fetch(api(`/v1/bots/${botId}/rooms/nope`), { headers: headers(tenantAKey) })
      expect(res.status).toBe(404)
    })

    it('returns 400 joining a room without an active credential', async () => {
      const botId = await createBot()
      const create = await fetch(api(`/v1/bots/${botId}/rooms`), {
        method: 'POST',
        headers: headers(tenantAKey),
        body: JSON.stringify({ externalRoomId: 'ch_room_1' })
      })
      const createBody = (await create.json()) as { data: { id: string } }

      const join = await fetch(api(`/v1/bots/${botId}/rooms/${createBody.data.id}/join`), {
        method: 'POST',
        headers: headers(tenantAKey)
      })
      expect(join.status).toBe(400)
    })
  })

  describe('lifecycle', () => {
    it('returns 400 starting a bot without an active credential', async () => {
      const botId = await createBot()
      const res = await fetch(api(`/v1/bots/${botId}/start`), {
        method: 'POST',
        headers: headers(tenantAKey)
      })
      expect(res.status).toBe(400)
    })

    it('stops a bot and marks it stopped', async () => {
      const botId = await createBot()
      const res = await fetch(api(`/v1/bots/${botId}/stop`), {
        method: 'POST',
        headers: headers(tenantAKey)
      })
      expect(res.status).toBe(200)
      const body = (await res.json()) as { data: { status: string } }
      expect(body.data.status).toBe('stopped')
    })
  })

  describe('usage', () => {
    it('returns a usage summary for a bot', async () => {
      const botId = await createBot()
      const res = await fetch(api(`/v1/bots/${botId}/usage`), { headers: headers(tenantAKey) })
      expect(res.status).toBe(200)
      const body = (await res.json()) as { data: Record<string, unknown> }
      expect(body.data.messages).toBe(0)
      expect(body.data.rooms).toBe(0)
    })

    it('lists recorded events honoring the limit query', async () => {
      const botId = await createBot()
      await usageRepo.record({ tenantId: 'tenant_1', botId, type: 'message_received' })
      await usageRepo.record({ tenantId: 'tenant_1', botId, type: 'ai_response' })

      const res = await fetch(api(`/v1/bots/${botId}/events?limit=1`), { headers: headers(tenantAKey) })
      expect(res.status).toBe(200)
      const body = (await res.json()) as { data: Array<{ type: string }> }
      expect(body.data).toHaveLength(1)
    })
  })
})
