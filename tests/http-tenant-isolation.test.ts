/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 *
 * HTTP-layer tenant isolation + legacy /api tenant-security regression tests.
 * Proves the authorization boundary holds over the wire (cross-tenant 404s) and
 * that the legacy /api surface now authenticates via tenant resolution rather
 * than a static global key.
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
import { InMemoryEventStore } from '../src/core/events/event-store.memory.js'
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

describe('HTTP cross-tenant isolation', () => {
  let app: ReturnType<typeof express>
  let server: { port: number, close: () => Promise<void> }

  beforeEach(async () => {
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
      bus,
      eventStore: new InMemoryEventStore()
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

  const url = (path: string): string => `http://127.0.0.1:${server.port}${path}`
  const headers = (key: string): Record<string, string> => ({
    'content-type': 'application/json',
    'x-api-key': key
  })

  const createBot = async (key = tenantAKey): Promise<string> => {
    const res = await fetch(url('/v1/bots'), {
      method: 'POST',
      headers: headers(key),
      body: JSON.stringify({ name: 'Bot', platform: 'clubhouse' })
    })
    expect(res.status).toBe(201)
    const body = (await res.json()) as { data: { id: string } }
    return body.data.id
  }

  it('Tenant A cannot read Tenant B bot (404 non-disclosure)', async () => {
    const botB = await createBot(tenantBKey)
    const res = await fetch(url(`/v1/bots/${botB}`), { headers: headers(tenantAKey) })
    expect(res.status).toBe(404)
  })

  it('Tenant A cannot update Tenant B bot', async () => {
    const botB = await createBot(tenantBKey)
    const res = await fetch(url(`/v1/bots/${botB}`), {
      method: 'PATCH',
      headers: headers(tenantAKey),
      body: JSON.stringify({ name: 'Hacked' })
    })
    expect(res.status).toBe(404)
  })

  it('Tenant A cannot delete Tenant B bot', async () => {
    const botB = await createBot(tenantBKey)
    const res = await fetch(url(`/v1/bots/${botB}`), {
      method: 'DELETE',
      headers: headers(tenantAKey)
    })
    expect(res.status).toBe(404)
    // Verify Tenant B still sees its bot.
    const stillThere = await fetch(url(`/v1/bots/${botB}`), { headers: headers(tenantBKey) })
    expect(stillThere.status).toBe(200)
  })

  it('Tenant A sees only its own bots in the list', async () => {
    await createBot(tenantAKey)
    await createBot(tenantBKey)
    const res = await fetch(url('/v1/bots'), { headers: headers(tenantAKey) })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: Array<{ id: string }> }
    expect(body.data).toHaveLength(1)
  })
})

describe('legacy /api tenant authentication', () => {
  let app: ReturnType<typeof express>
  let server: { port: number, close: () => Promise<void> }

  beforeEach(async () => {
    const tenantRepo = new InMemoryTenantRepository()
    await tenantRepo.create({ name: 'Tenant A', apiKeys: [tenantAKey] })
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
      bus,
      eventStore: new InMemoryEventStore()
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

  const url = (path: string): string => `http://127.0.0.1:${server.port}${path}`
  const headers = (key: string): Record<string, string> => ({
    'content-type': 'application/json',
    'x-api-key': key
  })

  it('rejects legacy /api calls without a tenant API key', async () => {
    const res = await fetch(url('/api/profiles/get_token'))
    expect(res.status).toBe(401)
  })

  it('rejects legacy /api calls with an invalid tenant API key', async () => {
    const res = await fetch(url('/api/profiles/get_token'), { headers: headers('nope') })
    expect(res.status).toBe(401)
  })

  it('rejects legacy /api calls with an unknown tenant API key', async () => {
    const res = await fetch(url('/api/profiles/get_token'), { headers: headers('unknown-key') })
    expect(res.status).toBe(401)
  })

  it('authenticates legacy /api via a valid tenant API key (auth passes)', async () => {
    // The legacy surface now uses tenant resolution; a valid tenant key
    // establishes req.tenant and is allowed through the auth boundary.
    // (profile.json is absent, so get_token returns 404 — but NOT 401, proving
    // the request cleared the tenant-auth middleware.)
    const res = await fetch(url('/api/profiles/get_token'), { headers: headers(tenantAKey) })
    expect(res.status).not.toBe(401)
  })

  it('still tags legacy /api responses with deprecation headers', async () => {
    const res = await fetch(url('/api/profiles/get_token'), { headers: headers(tenantAKey) })
    expect(res.status).not.toBe(401)
    expect(res.headers.get('deprecation')).toBeTruthy()
    expect(res.headers.get('sunset')).toBe('2027-02-01')
    expect(res.headers.get('link')).toContain('/v1')
  })
})
