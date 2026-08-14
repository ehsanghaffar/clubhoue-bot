/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 *
 * MVP Definition of Done (spec §32), exercised end-to-end through the public
 * /v1 API with a fake Clubhouse adapter:
 *
 *   Create Bot → attach encrypted Credential → configure Room → Start Bot →
 *   bot joins the room → user joins (welcome) → message → event processor →
 *   automation rules → AI decision/response → speaker request → allow-list
 *   check → invite → room ends → usage/event data.
 *
 * The same in-memory repositories and real services used elsewhere, but the
 * platform adapter is faked so no network/Clubhouse account is required. Two
 * bots/rooms are exercised to prove the system does not rely on
 * process-global mutable state.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
import { EventProcessor } from '../src/core/events/event-processor.js'
import { InMemoryEventStore } from '../src/core/events/event-store.memory.js'
import { AutomationStage } from '../src/core/automation/automation-stage.js'
import { AutomationEngine } from '../src/core/automation/rule-engine.js'
import { createWelcomeRule } from '../src/core/automation/rules/welcome.rule.js'
import { createSpeakerRule } from '../src/core/automation/rules/speaker.rule.js'
import { createAiRule } from '../src/core/automation/rules/ai.rule.js'
import { AgentService } from '../src/core/ai/agent.service.js'
import { AiService } from '../src/core/ai/ai.service.js'
import { InMemoryAiCooldownStore } from '../src/core/ai/in-memory-cooldown.js'
import { UsageStage } from '../src/core/usage/usage-stage.js'
import { InMemoryActionIdempotencyStore } from '../src/core/events/action-idempotency.js'
import { InMemoryMessageDeduplicator } from '../src/infrastructure/deduplication/message-dedup.js'
import { registerAdapterFactory } from '../src/platforms/adapter.js'
import type { CommunityPlatformAdapter } from '../src/platforms/adapter.js'
import type { Message } from '../src/core/types.js'
import type { AiProvider } from '../src/core/ai/ai.types.js'
import type { BotRoom } from '../src/core/rooms/room.types.js'
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
/** First InMemoryTenantRepository row, assigned to the tenant owning tenantAKey. */
const tenantAId = 'tenant_1'
const AI_ANSWER = '42 Jan'

/** A fake platform adapter that records what the bot sent and invited. */
interface FakeAdapter extends CommunityPlatformAdapter {
  sent: string[]
  invites: string[]
  /** Messages the platform returns from the next getMessages() call. */
  messages: Message[]
}

const makeFakeAdapter = (): FakeAdapter => {
  const adapter: FakeAdapter = {
    platform: 'clubhouse',
    sent: [],
    invites: [],
    messages: [],
    getRoom: vi.fn(),
    joinRoom: vi.fn(async () => {}),
    leaveRoom: vi.fn(async () => {}),
    getMessages: vi.fn(async () => [...adapter.messages]),
    sendMessage: vi.fn(async (_roomId: string, content: string) => { adapter.sent.push(content) }),
    getUser: vi.fn(),
    searchUsers: vi.fn(),
    inviteSpeaker: vi.fn(async (_roomId: string, userId: string) => { adapter.invites.push(userId) }),
    acceptSpeakerInvite: vi.fn()
  }
  return adapter
}

const makeFakeProvider = (): AiProvider => ({
  complete: vi.fn(async () => AI_ANSWER)
})

/** Per-bot adapters, addressed by the credential's externalAccountId. */
const adapters = new Map<string, FakeAdapter>()

// Registered once per test file (modules are isolated per file). BotService
// builds adapters through createPlatformAdapter, so faking the factory here
// makes the whole start→join→automation flow runnable offline.
registerAdapterFactory('clubhouse', (cred) => {
  const adapter = makeFakeAdapter()
  adapters.set(cred.externalAccountId ?? 'default', adapter)
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

describe('MVP definition of done (spec §32)', () => {
  let app: ReturnType<typeof express>
  let server: { port: number, close: () => Promise<void> }
  let botRepo: InMemoryBotRepository
  let roomRepo: InMemoryRoomRepository
  let usageRepo: InMemoryUsageRepository
  let bus: EventBus
  let roomService: RoomService
  let usageService: UsageService
  let botManager: BotManager
  let processor: EventProcessor

  beforeEach(async () => {
    adapters.clear()

    const tenantRepo = new InMemoryTenantRepository()
    await tenantRepo.create({ name: 'Tenant A', apiKeys: [tenantAKey] })
    await tenantRepo.create({ name: 'Tenant B', apiKeys: [tenantBKey] })
    const tenantSvc = new TenantService(tenantRepo)

    botRepo = new InMemoryBotRepository()
    roomRepo = new InMemoryRoomRepository()
    const memberRepo = new InMemoryRoomMemberRepository()
    usageRepo = new InMemoryUsageRepository()
    const credentialRepo = new InMemoryCredentialRepository()
    bus = new EventBus()

    const credentialService = new CredentialService(credentialRepo)
    const botService = new BotService({ repo: botRepo, credentials: credentialService })
    const flowEventStore = new InMemoryEventStore()
    roomService = new RoomService({
      repo: roomRepo,
      members: memberRepo,
      deduplicator: new InMemoryMessageDeduplicator(),
      bus,
      eventStore: flowEventStore
    })
    botManager = new BotManager({ bots: botRepo, rooms: roomRepo, roomService, botService, credentials: credentialService })
    usageService = new UsageService({ repo: usageRepo })
    const analyticsService = new AnalyticsService({ usage: usageRepo, rooms: roomRepo, members: memberRepo })

    // Deterministic AI provider + cooldown, no network required.
    const ai = new AiService({ provider: makeFakeProvider(), cooldown: new InMemoryAiCooldownStore() })
    const agentService = new AgentService({ ai, usage: usageService })

    const actions = new InMemoryActionIdempotencyStore()

    // Real automation engine: welcome + speaker (allow-list) + AI Q&A.
    const engine = new AutomationEngine()
    engine.addRule(createWelcomeRule({ actions }))
    engine.addRule(createSpeakerRule({ allowList: new Set(['u1']), actions }))
    engine.addRule(createAiRule({ runner: agentService.createRunner(), actions }))

    // Wire the real event pipeline onto the same bus RoomService publishes to.
    processor = new EventProcessor({ bus, eventStore: flowEventStore })
    processor.addStage(new AutomationStage({
      engine,
      resolveContext: (event) => botManager.resolveContext(event),
      usage: usageService
    }))
    processor.addStage(new UsageStage({ usage: usageService }))
    processor.start()

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
    processor.stop()
    botManager.stopAll()
    await server.close()
  })

  const api = (path: string): string => `http://127.0.0.1:${server.port}${path}`
  const headers = (key: string): Record<string, string> => ({
    'content-type': 'application/json',
    'x-api-key': key
  })

  const createBot = async (name: string, overrides: Record<string, unknown> = {}): Promise<string> => {
    const res = await fetch(api('/v1/bots'), {
      method: 'POST',
      headers: headers(tenantAKey),
      body: JSON.stringify({ name, platform: 'clubhouse', ...overrides })
    })
    expect(res.status).toBe(201)
    const body = (await res.json()) as { data: { id: string } }
    return body.data.id
  }

  const createRoom = async (botId: string, externalRoomId: string, settings?: Record<string, boolean>): Promise<string> => {
    const res = await fetch(api(`/v1/bots/${botId}/rooms`), {
      method: 'POST',
      headers: headers(tenantAKey),
      body: JSON.stringify({ externalRoomId, settings })
    })
    expect(res.status).toBe(201)
    const body = (await res.json()) as { data: { id: string } }
    return body.data.id
  }

  /** bot → credential → room → start, returns the room record. */
  const setupRunningBot = async (name: string, accountId: string, externalRoomId: string): Promise<{ botId: string, room: BotRoom }> => {
    const botId = await createBot(name)
    const credRes = await fetch(api(`/v1/bots/${botId}/credentials`), {
      method: 'POST',
      headers: headers(tenantAKey),
      body: JSON.stringify({ token: `tok-${accountId}`, externalAccountId: accountId })
    })
    expect(credRes.status).toBe(201)
    const roomId = await createRoom(botId, externalRoomId)
    const startRes = await fetch(api(`/v1/bots/${botId}/start`), { method: 'POST', headers: headers(tenantAKey) })
    expect(startRes.status).toBe(200)
    const room = await roomRepo.findByIdAndTenant(roomId, tenantAId)
    expect(room).not.toBeNull()
    return { botId, room: room as BotRoom }
  }

  it('runs the complete flow: bot → credential → room → start → join → welcome → AI → speaker → usage', async () => {
    // 1. Create a bot with a custom welcome template.
    const botId = await createBot('Alpha', { welcomeMessage: 'Welcome {username}!' })

    // 2. Attach an encrypted Clubhouse credential (token never returned).
    const credRes = await fetch(api(`/v1/bots/${botId}/credentials`), {
      method: 'POST',
      headers: headers(tenantAKey),
      body: JSON.stringify({ token: 'token-A', externalAccountId: 'uA' })
    })
    expect(credRes.status).toBe(201)

    // 3. Configure a room (auto-invite on for the speaker leg).
    const roomId = await createRoom(botId, 'ch_A', { autoInviteEnabled: true })

    // 4. Start the bot → it joins the configured room.
    const startRes = await fetch(api(`/v1/bots/${botId}/start`), { method: 'POST', headers: headers(tenantAKey) })
    expect(startRes.status).toBe(200)
    const adapterA = adapters.get('uA')
    expect(adapterA).toBeDefined()
    expect(adapterA!.joinRoom).toHaveBeenCalledWith('ch_A')
    expect((await roomRepo.findByIdAndTenant(roomId, tenantAId))?.status).toBe('active')

    // 5. The platform delivers a new member's question (real sync path).
    const room = await roomRepo.findByIdAndTenant(roomId, tenantAId)
    adapterA!.messages = [
      { id: 'm1', roomId: 'ch_A', userId: 'u1', content: 'what is the capital of France?', timestamp: new Date() }
    ]
    await roomService.syncRoom(room as BotRoom, adapterA!)

    // Welcome (user.joined) + AI answer (message.created) both sent to the room.
    await vi.waitFor(() => {
      expect(adapterA!.sent).toContain('Welcome friend!')
      expect(adapterA!.sent).toContain(AI_ANSWER)
    })

    // 6. Speaker request from an allow-listed user → invite.
    adapterA!.messages = [
      { id: 'm2', roomId: 'ch_A', userId: 'u1', content: 'please invite me to the stage', timestamp: new Date() }
    ]
    await roomService.syncRoom(room as BotRoom, adapterA!)
    await vi.waitFor(() => {
      expect(adapterA!.invites).toContain('u1')
    })

    // 7. Room ends → leave → usage/event data recorded.
    await roomService.leave(room as BotRoom, adapterA!)
    await vi.waitFor(async () => {
      const events = await usageRepo.listByBotAndTenant(tenantAId, botId)
      expect(events.some((e) => e.type === 'room_leave')).toBe(true)
      const summary = await usageService.summarizeByBotAndTenant(tenantAId, botId)
      expect(summary.messages).toBe(2) // two message.created events
      expect(summary.aiRequests).toBe(1) // one AI decision
      expect(summary.aiResponses).toBe(1) // one AI response sent
      expect(summary.automationActions).toBe(3) // welcome + AI + speaker
    })
  })

  it('supports multiple bots and rooms without process-global mutable state', async () => {
    const a = await setupRunningBot('Alpha', 'uA', 'ch_A')
    const b = await setupRunningBot('Beta', 'uB', 'ch_B')

    const adapterA = adapters.get('uA')
    const adapterB = adapters.get('uB')
    expect(adapterA).toBeDefined()
    expect(adapterB).toBeDefined()
    expect(adapterA!.joinRoom).toHaveBeenCalledWith('ch_A')
    expect(adapterB!.joinRoom).toHaveBeenCalledWith('ch_B')

    // Only bot B's room receives activity.
    adapterB!.messages = [
      { id: 'm1', roomId: 'ch_B', userId: 'u2', content: 'how does this work?', timestamp: new Date() }
    ]
    await roomService.syncRoom(b.room, adapterB!)

    // Bot B responds (welcome + AI answer)...
    await vi.waitFor(() => {
      expect(adapterB!.sent).toContain(AI_ANSWER)
    })
    expect(adapterB!.sent).toContain('Welcome friend! 👋')

    // ...while bot A's adapter is untouched: no cross-talk.
    expect(adapterA!.sent).toEqual([])
    expect(adapterA!.invites).toEqual([])

    // Usage is scoped per bot.
    const summaryA = await usageService.summarizeByBotAndTenant(tenantAId, a.botId)
    const summaryB = await usageService.summarizeByBotAndTenant(tenantAId, b.botId)
    expect(summaryA.aiResponses).toBe(0)
    expect(summaryB.aiResponses).toBe(1)
  })
})
