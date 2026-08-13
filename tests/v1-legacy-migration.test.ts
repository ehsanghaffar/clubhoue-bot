/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
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
import { registerAdapterFactory } from '../src/platforms/adapter.js'
import type { CommunityPlatformAdapter } from '../src/platforms/adapter.js'
import type { Message, User } from '../src/core/types.js'
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

/** A fake platform adapter that records what the migrated endpoints did. */
interface FakeAdapter extends CommunityPlatformAdapter {
  sent: string[]
  acceptedInvites: string[]
  /** Messages the platform returns from getMessages(). */
  messages: Message[]
  /** Users the platform returns from searchUsers(). */
  searchResults: User[]
}

const makeFakeAdapter = (): FakeAdapter => {
  const adapter: FakeAdapter = {
    platform: 'clubhouse',
    sent: [],
    acceptedInvites: [],
    messages: [],
    searchResults: [],
    getRoom: vi.fn(),
    joinRoom: vi.fn(async () => {}),
    leaveRoom: vi.fn(async () => {}),
    getMessages: vi.fn(async () => [...adapter.messages]),
    sendMessage: vi.fn(async (_roomId: string, content: string) => { adapter.sent.push(content) }),
    getUser: vi.fn(async (id: string): Promise<User> => ({
      id,
      platform: 'clubhouse',
      username: `user-${id}`,
      displayName: `User ${id}`
    })),
    searchUsers: vi.fn(async () => [...adapter.searchResults]),
    inviteSpeaker: vi.fn(),
    acceptSpeakerInvite: vi.fn(async () => { adapter.acceptedInvites.push('accepted') })
  }
  return adapter
}

/** Cached per-bot adapters (createAdapter runs per request, so reuse instances). */
const adapters = new Map<string, FakeAdapter>()

// Registered once per test file (modules are isolated per file). This lets the
// migrated /v1 endpoints build a bot's adapter offline instead of hitting the
// real Clubhouse API. The instance is cached per credential so every request
// on the same bot sees the same fake (and its recorded state).
registerAdapterFactory('clubhouse', (cred) => {
  const key = cred.externalAccountId ?? 'default'
  let adapter = adapters.get(key)
  if (adapter == null) {
    adapter = makeFakeAdapter()
    adapters.set(key, adapter)
  }
  return adapter
})

const startServer = async (app: ReturnType<typeof express>): Promise<{ port: number, close: () => Promise<void> }> => {
  const server = app.listen(0)
  await new Promise<void>((resolve) => server.once('listening', resolve))
  const port = (server.address() as AddressInfo).port
  return {
    port,
    close: () => new Promise<void>((resolve) => server.close(() => resolve()))
  }
}

describe('v1 legacy migration', () => {
  let app: ReturnType<typeof express>
  let server: { port: number, close: () => Promise<void> }
  let botManager: BotManager

  beforeEach(async () => {
    adapters.clear()
    // Required by the legacy /api auth middleware (used by the deprecation test).
    process.env.API_KEY = 'test-api-key-123'

    const tenantRepo = new InMemoryTenantRepository()
    await tenantRepo.create({ name: 'Tenant A', apiKeys: [tenantAKey] })
    await tenantRepo.create({ name: 'Tenant B', apiKeys: [tenantBKey] })
    const tenantSvc = new TenantService(tenantRepo)

    const botRepo = new InMemoryBotRepository()
    const roomRepo = new InMemoryRoomRepository()
    const memberRepo = new InMemoryRoomMemberRepository()
    const usageRepo = new InMemoryUsageRepository()
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
    botManager = new BotManager({ bots: botRepo, rooms: roomRepo, roomService, botService, credentials: credentialService })
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
    await botManager.stopAll()
    await server.close()
    delete process.env.API_KEY
  })

  const api = (path: string): string => `http://127.0.0.1:${server.port}${path}`
  const headers = (key: string): Record<string, string> => ({
    'content-type': 'application/json',
    'x-api-key': key
  })

  const createBot = async (key = tenantAKey): Promise<string> => {
    const res = await fetch(api('/v1/bots'), {
      method: 'POST',
      headers: headers(key),
      body: JSON.stringify({ name: 'Legacy', platform: 'clubhouse' })
    })
    expect(res.status).toBe(201)
    const body = (await res.json()) as { data: { id: string } }
    return body.data.id
  }

  const addCredential = async (botId: string, externalAccountId: string, key = tenantAKey): Promise<void> => {
    const res = await fetch(api(`/v1/bots/${botId}/credentials`), {
      method: 'POST',
      headers: headers(key),
      body: JSON.stringify({ token: 'secret-token', externalAccountId })
    })
    expect(res.status).toBe(201)
  }

  const createRoom = async (botId: string, externalRoomId: string, key = tenantAKey): Promise<string> => {
    const res = await fetch(api(`/v1/bots/${botId}/rooms`), {
      method: 'POST',
      headers: headers(key),
      body: JSON.stringify({ externalRoomId })
    })
    expect(res.status).toBe(201)
    const body = (await res.json()) as { data: { id: string } }
    return body.data.id
  }

  describe('messages (legacy room-msgs / send-room-msg)', () => {
    it('sends a message to a room through the bot adapter', async () => {
      const botId = await createBot()
      await addCredential(botId, 'uA')
      const roomId = await createRoom(botId, 'ch_1')

      const res = await fetch(api(`/v1/bots/${botId}/rooms/ch_1/messages`), {
        method: 'POST',
        headers: headers(tenantAKey),
        body: JSON.stringify({ message: 'hello world' })
      })
      expect(res.status).toBe(200)
      const body = (await res.json()) as { data: { ok: boolean } }
      expect(body.data.ok).toBe(true)
      // The adapter factory runs lazily during the request above.
      expect(adapters.get('uA')!.sent).toEqual(['hello world'])
    })

    it('returns 400 when the message body is invalid', async () => {
      const botId = await createBot()
      await addCredential(botId, 'uA')
      const roomId = await createRoom(botId, 'ch_1')

      const res = await fetch(api(`/v1/bots/${botId}/rooms/ch_1/messages`), {
        method: 'POST',
        headers: headers(tenantAKey),
        body: JSON.stringify({ message: '' })
      })
      expect(res.status).toBe(400)
    })

    it('lists normalized room messages from the adapter', async () => {
      const botId = await createBot()
      await addCredential(botId, 'uA')
      const roomId = await createRoom(botId, 'ch_1')
      // Trigger lazy adapter creation so the fake can be seeded before GET.
      await fetch(api(`/v1/bots/${botId}/me`), { headers: headers(tenantAKey) })
      adapters.get('uA')!.messages = [{
        id: 'm1',
        roomId: 'ch_1',
        userId: 'u9',
        content: 'hi',
        timestamp: new Date('2026-08-11T00:00:00.000Z')
      }]

      const res = await fetch(api(`/v1/bots/${botId}/rooms/ch_1/messages`), {
        headers: headers(tenantAKey)
      })
      expect(res.status).toBe(200)
      const body = (await res.json()) as { data: Array<{ id: string, content: string }> }
      expect(body.data).toHaveLength(1)
      expect(body.data[0].id).toBe('m1')
      expect(body.data[0].content).toBe('hi')
    })
  })

  describe('speaker invites (legacy accept_invite)', () => {
    it('accepts a speaker invite on the bot adapter', async () => {
      const botId = await createBot()
      await addCredential(botId, 'uA')
      const roomId = await createRoom(botId, 'ch_1')

      const res = await fetch(api(`/v1/bots/${botId}/rooms/ch_1/accept-invite`), {
        method: 'POST',
        headers: headers(tenantAKey)
      })
      expect(res.status).toBe(200)
      const body = (await res.json()) as { data: { ok: boolean } }
      expect(body.data.ok).toBe(true)
      expect(adapters.get('uA')!.acceptedInvites).toEqual(['accepted'])
    })
  })

  describe('users (legacy search_users / get_user / me)', () => {
    it('searches users through the bot adapter', async () => {
      const botId = await createBot()
      await addCredential(botId, 'uA')
      // Trigger lazy adapter creation so the fake can be seeded before POST.
      await fetch(api(`/v1/bots/${botId}/me`), { headers: headers(tenantAKey) })
      adapters.get('uA')!.searchResults = [{ id: 'u42', platform: 'clubhouse', username: 'sara', displayName: 'Sara' }]

      const res = await fetch(api(`/v1/bots/${botId}/users/search`), {
        method: 'POST',
        headers: headers(tenantAKey),
        body: JSON.stringify({ query: 'sara' })
      })
      expect(res.status).toBe(200)
      const body = (await res.json()) as { data: Array<{ id: string }> }
      expect(body.data).toHaveLength(1)
      expect(body.data[0].id).toBe('u42')
      expect(adapters.get('uA')!.searchUsers).toHaveBeenCalledWith('sara')
    })

    it('gets a user by id through the bot adapter', async () => {
      const botId = await createBot()
      await addCredential(botId, 'uA')

      const res = await fetch(api(`/v1/bots/${botId}/users/u42`), {
        headers: headers(tenantAKey)
      })
      expect(res.status).toBe(200)
      const body = (await res.json()) as { data: { id: string, username: string } }
      expect(body.data.id).toBe('u42')
      expect(body.data.username).toBe('user-u42')
    })

    it('returns the bot own profile from /me (legacy channels/me)', async () => {
      const botId = await createBot()
      await addCredential(botId, 'uA')

      const res = await fetch(api(`/v1/bots/${botId}/me`), {
        headers: headers(tenantAKey)
      })
      expect(res.status).toBe(200)
      const body = (await res.json()) as { data: { id: string, username: string } }
      expect(body.data.id).toBe('uA')
      expect(body.data.username).toBe('user-uA')
    })

    it('returns 400 on migrated endpoints when the bot has no active credential', async () => {
      const botId = await createBot()
      const res = await fetch(api(`/v1/bots/${botId}/users/search`), {
        method: 'POST',
        headers: headers(tenantAKey),
        body: JSON.stringify({ query: 'sara' })
      })
      expect(res.status).toBe(400)
      const body = (await res.json()) as { error: { type: string } }
      expect(body.error.type).toBe('BAD_REQUEST')
    })
  })

  describe('tenant isolation', () => {
    it('returns 404 for migrated endpoints on another tenant\u2019s bot', async () => {
      const botId = await createBot(tenantAKey)
      await addCredential(botId, 'uA')
      const roomId = await createRoom(botId, 'ch_1')

      const search = await fetch(api(`/v1/bots/${botId}/users/search`), {
        method: 'POST',
        headers: headers(tenantBKey),
        body: JSON.stringify({ query: 'sara' })
      })
      expect(search.status).toBe(404)

      const messages = await fetch(api(`/v1/bots/${botId}/rooms/ch_1/messages`), {
        headers: headers(tenantBKey)
      })
      expect(messages.status).toBe(404)
    })
  })

})
