/**
 * @license
 * @copyright Ehsanghaffarii.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BotManager } from '../src/core/bots/bot-manager.js'
import { BotService } from '../src/core/bots/bot.service.js'
import { RoomService } from '../src/core/rooms/room.service.js'
import { EventBus } from '../src/core/events/event-bus.js'
import { InMemoryEventStore } from '../src/core/events/event-store.memory.js'
import { InMemoryMessageDeduplicator } from '../src/infrastructure/deduplication/message-dedup.js'
import {
  InMemoryBotRepository,
  InMemoryRoomRepository,
  InMemoryRoomMemberRepository
} from './helpers/in-memory.js'
import type { Bot } from '../src/core/bots/bot.types.js'
import type { Message, Room, User } from '../src/core/types.js'
import type { CommunityPlatformAdapter } from '../src/platforms/adapter.js'
import type { CommunityEvent } from '../src/core/events/event.types.js'

const makeBot = (overrides: Partial<Bot> = {}): Bot => ({
  id: 'bot-1',
  tenantId: 'tenant-1',
  name: 'Helper',
  platform: 'clubhouse',
  status: 'active',
  aiConfig: { enabled: true, model: 'gpt-4o-mini', temperature: 0.4, maxOutputTokens: 150, maxResponseLength: 280, triggerMode: 'question', triggerPrefix: '#', cooldownSeconds: 30 },
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
})

describe('BotManager', () => {
  let botRepo: InMemoryBotRepository
  let roomRepo: InMemoryRoomRepository
  let memberRepo: InMemoryRoomMemberRepository
  let bus: EventBus
  let botService: BotService
  let botManager: BotManager
  const adapter = {
    platform: 'clubhouse' as const,
    getRoom: vi.fn(async (): Promise<Room> => ({ id: 'ch_abc', platform: 'clubhouse' })),
    joinRoom: vi.fn(async () => {}),
    leaveRoom: vi.fn(async () => {}),
    getMessages: vi.fn(async (): Promise<Message[]> => []),
    sendMessage: vi.fn(async () => {}),
    getUser: vi.fn(async (): Promise<User> => ({ id: 'u-1', platform: 'clubhouse' })),
    searchUsers: vi.fn(async (): Promise<User[]> => []),
    inviteSpeaker: vi.fn(async () => {}),
    acceptSpeakerInvite: vi.fn(async () => {}),
    ping: vi.fn(async () => {})
  }

  const credentials = {
    getActiveByBot: async () => ({
      id: 'cred-1',
      tenantId: 'tenant-1',
      botId: 'bot-1',
      platform: 'clubhouse' as const,
      encryptedToken: 'x',
      externalAccountId: 'ext-1',
      externalAccountName: 'helper',
      status: 'active' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    }),
    markInvalid: vi.fn(),
    decryptForRuntime: async () => ({ token: 'tok', externalAccountId: 'ext-1', externalAccountName: 'helper' }),
    createCredential: vi.fn(),
    listByBotAndTenant: vi.fn(),
    getByIdAndTenant: vi.fn(),
    revoke: vi.fn(),
    deleteCredential: vi.fn()
  }

  beforeEach(() => {
    botRepo = new InMemoryBotRepository()
    roomRepo = new InMemoryRoomRepository()
    memberRepo = new InMemoryRoomMemberRepository()
    bus = new EventBus()
    const roomService = new RoomService({ repo: roomRepo, members: memberRepo, deduplicator: new InMemoryMessageDeduplicator(), bus, eventStore: new InMemoryEventStore() })
    botService = new BotService({
      repo: botRepo,
      credentials: credentials as never
    })
    vi.spyOn(botService, 'createAdapter').mockResolvedValue(adapter)
    vi.spyOn(botService, 'getBotExternalUserId').mockResolvedValue('ext-1')
    botManager = new BotManager({
      bots: botRepo,
      rooms: roomRepo,
      roomService,
      botService,
      credentials: credentials as never
    })
  })

  it('resolves null context for unknown bots', async () => {
    const context = await botManager.resolveContext({
      id: 'e', tenantId: 't', botId: 'nope', roomId: 'room-1', platform: 'clubhouse', type: 'message.created', timestamp: new Date(), payload: {}
    })
    expect(context).toBeNull()
  })

  it('joins configured rooms and marks bot active on start', async () => {
    const bot = await botRepo.create({ tenantId: 'tenant-1', name: 'Helper', platform: 'clubhouse' })
    await roomRepo.create({ tenantId: 'tenant-1', botId: bot.id, platform: 'clubhouse', externalRoomId: 'M84V9RyJ' })

    await botManager.startBot({ tenantId: 'tenant-1', botId: bot.id })
    expect((await botRepo.findByIdAndTenant(bot.id, 'tenant-1'))?.status).toBe('active')
    const room = await roomRepo.findByBotAndTenant(bot.id, 'tenant-1')
    expect(room[0].status).toBe('active')
    expect(adapter.ping).toHaveBeenCalledWith('M84V9RyJ')
  })

  it('stopBot marks the bot stopped and clears loops', async () => {
    const bot = await botRepo.create({ tenantId: 'tenant-1', name: 'Helper', platform: 'clubhouse' })

    await botManager.startBot({ tenantId: 'tenant-1', botId: bot.id })
    await botManager.stopBot({ tenantId: 'tenant-1', botId: bot.id })
    expect((await botRepo.findByIdAndTenant(bot.id, 'tenant-1'))?.status).toBe('stopped')
  })

  it('startAll restarts previously active bots', async () => {
    const bot = await botRepo.create({ tenantId: 'tenant-1', name: 'Helper', platform: 'clubhouse' })
    await botRepo.update(bot.tenantId, bot.id, { status: 'active' })

    await botManager.startAll()
    expect((await botRepo.findByIdAndTenant(bot.id, 'tenant-1'))?.status).toBe('active')
  })

  it('starts and stops the per-room active ping loop while the room is active', async () => {
    vi.useFakeTimers()
    try {
      const bot = await botRepo.create({ tenantId: 'tenant-1', name: 'Helper', platform: 'clubhouse' })
      const room = await roomRepo.create({ tenantId: 'tenant-1', botId: bot.id, platform: 'clubhouse', externalRoomId: 'M84V9RyJ' })
      const ping = vi.fn(async () => {})
      const runtimeAdapter = { ...adapter, ping }
      vi.spyOn(botService, 'createAdapter').mockResolvedValue(runtimeAdapter as never)

      await botManager.startBot({ tenantId: 'tenant-1', botId: bot.id })
      expect(ping).toHaveBeenCalledWith('M84V9RyJ')
      const callsAfterStart = ping.mock.calls.length
      await vi.advanceTimersByTimeAsync(180_000)
      expect(ping.mock.calls.length).toBeGreaterThan(callsAfterStart)

      await botManager.stopBot({ tenantId: 'tenant-1', botId: bot.id })
      const pingCallsAfterStop = ping.mock.calls.length
      await vi.advanceTimersByTimeAsync(180_000)
      expect(ping.mock.calls.length).toBe(pingCallsAfterStop)
      expect((await roomRepo.findByIdAndTenant(room.id, 'tenant-1'))?.status).toBe('active')
    } finally {
      vi.useRealTimers()
    }
  })

  it('startBot is idempotent: no duplicate joins on repeated starts (F-01)', async () => {
    const bot = await botRepo.create({ tenantId: 'tenant-1', name: 'Helper', platform: 'clubhouse' })
    await roomRepo.create({ tenantId: 'tenant-1', botId: bot.id, platform: 'clubhouse', externalRoomId: 'M84V9RyJ' })

    await botManager.startBot({ tenantId: 'tenant-1', botId: bot.id })
    const joinsAfterFirst = (adapter.joinRoom as ReturnType<typeof vi.fn>).mock.calls.length
    await botManager.startBot({ tenantId: 'tenant-1', botId: bot.id })

    expect((await botRepo.findByIdAndTenant(bot.id, 'tenant-1'))?.status).toBe('active')
    expect((adapter.joinRoom as ReturnType<typeof vi.fn>).mock.calls.length).toBe(joinsAfterFirst)
  })

  it('inviteSpeaker uses externalRoomId not internal mongo id', async () => {
    const bot = await botRepo.create({ tenantId: 'tenant-1', name: 'Helper', platform: 'clubhouse' })
    const room = await roomRepo.create({ tenantId: 'tenant-1', botId: bot.id, platform: 'clubhouse', externalRoomId: 'M84V9RyJ' })
    await roomRepo.update('tenant-1', room.id, { status: 'active' })
    await botManager.startBot({ tenantId: 'tenant-1', botId: bot.id })

    await botManager.inviteSpeaker({ tenantId: 'tenant-1', botId: bot.id, roomId: room.id, userId: 'user-123' })
    expect(adapter.inviteSpeaker).toHaveBeenCalledWith('M84V9RyJ', 'user-123')
  })
})
