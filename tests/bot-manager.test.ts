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
import { ClubhouseApiError } from '../src/platforms/clubhouse/errors.js'

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
    vi.clearAllMocks()
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

  it('concurrent startBot calls produce exactly one runtime (F-03)', async () => {
    const bot = await botRepo.create({ tenantId: 'tenant-1', name: 'Helper', platform: 'clubhouse' })
    await roomRepo.create({ tenantId: 'tenant-1', botId: bot.id, platform: 'clubhouse', externalRoomId: 'M84V9RyJ' })

    await Promise.all([
      botManager.startBot({ tenantId: 'tenant-1', botId: bot.id }),
      botManager.startBot({ tenantId: 'tenant-1', botId: bot.id }),
      botManager.startBot({ tenantId: 'tenant-1', botId: bot.id })
    ])

    expect((await botRepo.findByIdAndTenant(bot.id, 'tenant-1'))?.status).toBe('active')
    expect((adapter.joinRoom as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1)
  })

  it('a stop that wins during an in-flight start leaves the bot stopped with no runtime (F-03)', async () => {
    vi.useFakeTimers()
    try {
      const bot = await botRepo.create({ tenantId: 'tenant-1', name: 'Helper', platform: 'clubhouse' })
      await roomRepo.create({ tenantId: 'tenant-1', botId: bot.id, platform: 'clubhouse', externalRoomId: 'M84V9RyJ' })

      let releaseStart: (() => void) | undefined
      let entered: (() => void) | undefined
      const gate = new Promise<void>((resolve) => { releaseStart = resolve })
      const enteredP = new Promise<void>((resolve) => { entered = resolve })
      const originalGetActive = credentials.getActiveByBot
      credentials.getActiveByBot = async () => {
        entered?.()
        await gate
        return originalGetActive()
      }
      try {
        const startP = botManager.startBot({ tenantId: 'tenant-1', botId: bot.id })
        await enteredP
        await botManager.stopBot({ tenantId: 'tenant-1', botId: bot.id })
        releaseStart?.()
        await startP
      } finally {
        credentials.getActiveByBot = originalGetActive
      }

      expect((await botRepo.findByIdAndTenant(bot.id, 'tenant-1'))?.status).toBe('stopped')
      expect((adapter.ping as ReturnType<typeof vi.fn>).mock.calls.length).toBe(0)
      const pingCalls = (adapter.ping as ReturnType<typeof vi.fn>).mock.calls.length
      const syncCalls = (adapter.getMessages as ReturnType<typeof vi.fn>).mock.calls.length
      await vi.advanceTimersByTimeAsync(600_000)
      expect((adapter.ping as ReturnType<typeof vi.fn>).mock.calls.length).toBe(pingCalls)
      expect((adapter.getMessages as ReturnType<typeof vi.fn>).mock.calls.length).toBe(syncCalls)
    } finally {
      vi.useRealTimers()
    }
  })

  it('stop then start restores the bot active with one timer set per room (F-03)', async () => {
    vi.useFakeTimers()
    try {
      const bot = await botRepo.create({ tenantId: 'tenant-1', name: 'Helper', platform: 'clubhouse' })
      await roomRepo.create({ tenantId: 'tenant-1', botId: bot.id, platform: 'clubhouse', externalRoomId: 'M84V9RyJ' })

      await botManager.startBot({ tenantId: 'tenant-1', botId: bot.id })
      expect((await botRepo.findByIdAndTenant(bot.id, 'tenant-1'))?.status).toBe('active')

      let pingCalls = (adapter.ping as ReturnType<typeof vi.fn>).mock.calls.length
      let syncCalls = (adapter.getMessages as ReturnType<typeof vi.fn>).mock.calls.length
      await vi.advanceTimersByTimeAsync(180_000)
      expect((adapter.ping as ReturnType<typeof vi.fn>).mock.calls.length).toBe(pingCalls + 1)
      expect((adapter.getMessages as ReturnType<typeof vi.fn>).mock.calls.length).toBe(syncCalls + 12)

      await botManager.stopBot({ tenantId: 'tenant-1', botId: bot.id })
      expect((await botRepo.findByIdAndTenant(bot.id, 'tenant-1'))?.status).toBe('stopped')

      pingCalls = (adapter.ping as ReturnType<typeof vi.fn>).mock.calls.length
      syncCalls = (adapter.getMessages as ReturnType<typeof vi.fn>).mock.calls.length
      await vi.advanceTimersByTimeAsync(180_000)
      expect((adapter.ping as ReturnType<typeof vi.fn>).mock.calls.length).toBe(pingCalls)
      expect((adapter.getMessages as ReturnType<typeof vi.fn>).mock.calls.length).toBe(syncCalls)

      await botManager.startBot({ tenantId: 'tenant-1', botId: bot.id })
      expect((await botRepo.findByIdAndTenant(bot.id, 'tenant-1'))?.status).toBe('active')

      pingCalls = (adapter.ping as ReturnType<typeof vi.fn>).mock.calls.length
      syncCalls = (adapter.getMessages as ReturnType<typeof vi.fn>).mock.calls.length
      const joinsAfterRestart = (adapter.joinRoom as ReturnType<typeof vi.fn>).mock.calls.length
      await vi.advanceTimersByTimeAsync(180_000)
      expect((adapter.ping as ReturnType<typeof vi.fn>).mock.calls.length).toBe(pingCalls + 1)
      expect((adapter.getMessages as ReturnType<typeof vi.fn>).mock.calls.length).toBe(syncCalls + 12)
      expect((adapter.joinRoom as ReturnType<typeof vi.fn>).mock.calls.length).toBe(joinsAfterRestart)
    } finally {
      vi.useRealTimers()
    }
  })

  it('a 401 in one room invalidates the credential and stops every room of the bot (F-04)', async () => {
    vi.useFakeTimers()
    try {
      const bot = await botRepo.create({ tenantId: 'tenant-1', name: 'Helper', platform: 'clubhouse' })
      await roomRepo.create({ tenantId: 'tenant-1', botId: bot.id, platform: 'clubhouse', externalRoomId: 'extA' })
      await roomRepo.create({ tenantId: 'tenant-1', botId: bot.id, platform: 'clubhouse', externalRoomId: 'extB' })
      await roomRepo.create({ tenantId: 'tenant-1', botId: bot.id, platform: 'clubhouse', externalRoomId: 'extC' })

      const pingCounts: Record<string, number> = {}
      const ping = vi.fn(async (externalRoomId: string) => {
        pingCounts[externalRoomId] = (pingCounts[externalRoomId] ?? 0) + 1
        if (externalRoomId === 'extB' && pingCounts[externalRoomId] > 1) {
          throw new ClubhouseApiError({ operation: 'ping', status: 401, kind: 'authentication' })
        }
      })
      const runtimeAdapter = { ...adapter, ping }
      vi.spyOn(botService, 'createAdapter').mockResolvedValue(runtimeAdapter as never)

      await botManager.startBot({ tenantId: 'tenant-1', botId: bot.id })
      expect((await botRepo.findByIdAndTenant(bot.id, 'tenant-1'))?.status).toBe('active')

      await vi.advanceTimersByTimeAsync(180_000)

      expect(credentials.markInvalid).toHaveBeenCalledWith('tenant-1', 'cred-1')
      const rooms = await roomRepo.findByBotAndTenant(bot.id, 'tenant-1')
      expect(rooms).toHaveLength(3)
      for (const room of rooms) {
        expect(room.status).toBe('error')
      }
      expect((await botRepo.findByIdAndTenant(bot.id, 'tenant-1'))?.status).toBe('error')

      const callsAfterFailure = ping.mock.calls.length
      await vi.advanceTimersByTimeAsync(600_000)
      expect(ping.mock.calls.length).toBe(callsAfterFailure)
    } finally {
      vi.useRealTimers()
    }
  })

  it('a transient 429 ping failure keeps the bot runtime alive and the credential valid (F-04)', async () => {
    vi.useFakeTimers()
    try {
      const bot = await botRepo.create({ tenantId: 'tenant-1', name: 'Helper', platform: 'clubhouse' })
      await roomRepo.create({ tenantId: 'tenant-1', botId: bot.id, platform: 'clubhouse', externalRoomId: 'M84V9RyJ' })

      const ping = vi.fn(async () => {
        throw new ClubhouseApiError({ operation: 'ping', status: 429, kind: 'rate_limited' })
      })
      const runtimeAdapter = { ...adapter, ping }
      vi.spyOn(botService, 'createAdapter').mockResolvedValue(runtimeAdapter as never)

      // The join-time ping retries (with backoff) before giving up; advance
      // timers so those retries elapse while the start is in flight.
      const startP = botManager.startBot({ tenantId: 'tenant-1', botId: bot.id })
      await vi.advanceTimersByTimeAsync(10_000)
      await startP
      expect((await botRepo.findByIdAndTenant(bot.id, 'tenant-1'))?.status).toBe('active')
      expect(credentials.markInvalid).not.toHaveBeenCalled()

      const pingCalls = ping.mock.calls.length
      await vi.advanceTimersByTimeAsync(180_000)
      expect((await botRepo.findByIdAndTenant(bot.id, 'tenant-1'))?.status).toBe('active')
      expect(credentials.markInvalid).not.toHaveBeenCalled()
      expect(ping.mock.calls.length).toBe(pingCalls + 1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('retries the immediate active ping after join until it succeeds', async () => {
    vi.useFakeTimers()
    try {
      const bot = await botRepo.create({ tenantId: 'tenant-1', name: 'Helper', platform: 'clubhouse' })
      await roomRepo.create({ tenantId: 'tenant-1', botId: bot.id, platform: 'clubhouse', externalRoomId: 'M84V9RyJ' })

      let calls = 0
      const ping = vi.fn(async () => {
        calls += 1
        if (calls <= 2) {
          throw new ClubhouseApiError({ operation: 'activePing', kind: 'network' })
        }
      })
      const runtimeAdapter = { ...adapter, ping }
      vi.spyOn(botService, 'createAdapter').mockResolvedValue(runtimeAdapter as never)

      const startP = botManager.startBot({ tenantId: 'tenant-1', botId: bot.id })
      await vi.advanceTimersByTimeAsync(10_000)
      await startP

      expect(ping).toHaveBeenCalledTimes(3)
      expect(ping).toHaveBeenCalledWith('M84V9RyJ')
      expect((await botRepo.findByIdAndTenant(bot.id, 'tenant-1'))?.status).toBe('active')
      expect(credentials.markInvalid).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('startup reconciliation verifies, rejoins, pings, and arms timers for a persisted active room that exists', async () => {
    vi.useFakeTimers()
    try {
      const bot = await botRepo.create({ tenantId: 'tenant-1', name: 'Helper', platform: 'clubhouse' })
      const room = await roomRepo.create({ tenantId: 'tenant-1', botId: bot.id, platform: 'clubhouse', externalRoomId: 'M84V9RyJ' })
      await roomRepo.update('tenant-1', room.id, { status: 'active' })

      await botManager.startBot({ tenantId: 'tenant-1', botId: bot.id })

      // Order: verify existence → rejoin → activePing.
      expect(adapter.getRoom).toHaveBeenCalledWith('M84V9RyJ')
      expect(adapter.joinRoom).toHaveBeenCalledWith('M84V9RyJ')
      expect(adapter.ping).toHaveBeenCalledWith('M84V9RyJ')
      expect((await roomRepo.findByIdAndTenant(room.id, 'tenant-1'))?.status).toBe('active')

      // Timers are armed for the verified room.
      const pingCalls = adapter.ping.mock.calls.length
      const syncCalls = adapter.getMessages.mock.calls.length
      await vi.advanceTimersByTimeAsync(180_000)
      expect(adapter.ping.mock.calls.length).toBeGreaterThan(pingCalls)
      expect(adapter.getMessages.mock.calls.length).toBeGreaterThan(syncCalls)
    } finally {
      vi.useRealTimers()
    }
  })

  it('startup reconciliation deactivates a persisted active room that Clubhouse reports gone (404)', async () => {
    vi.useFakeTimers()
    try {
      const bot = await botRepo.create({ tenantId: 'tenant-1', name: 'Helper', platform: 'clubhouse' })
      const room = await roomRepo.create({ tenantId: 'tenant-1', botId: bot.id, platform: 'clubhouse', externalRoomId: 'M84V9RyJ' })
      await roomRepo.update('tenant-1', room.id, { status: 'active' })

      const getRoom = vi.fn(async () => {
        throw new ClubhouseApiError({ operation: 'getRoom', status: 404, kind: 'not_found' })
      })
      const runtimeAdapter = { ...adapter, getRoom }
      vi.spyOn(botService, 'createAdapter').mockResolvedValue(runtimeAdapter as never)

      await botManager.startBot({ tenantId: 'tenant-1', botId: bot.id })

      expect(getRoom).toHaveBeenCalledWith('M84V9RyJ')
      expect((await roomRepo.findByIdAndTenant(room.id, 'tenant-1'))?.status).toBe('inactive')
      expect(adapter.joinRoom).not.toHaveBeenCalled()
      expect(adapter.ping).not.toHaveBeenCalled()

      // No timers are armed for the deactivated room.
      const pingCalls = adapter.ping.mock.calls.length
      const syncCalls = adapter.getMessages.mock.calls.length
      await vi.advanceTimersByTimeAsync(600_000)
      expect(adapter.ping.mock.calls.length).toBe(pingCalls)
      expect(adapter.getMessages.mock.calls.length).toBe(syncCalls)
      expect(credentials.markInvalid).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('startup reconciliation leaves a room unchanged on a transient existence failure (500)', async () => {
    vi.useFakeTimers()
    try {
      const bot = await botRepo.create({ tenantId: 'tenant-1', name: 'Helper', platform: 'clubhouse' })
      const room = await roomRepo.create({ tenantId: 'tenant-1', botId: bot.id, platform: 'clubhouse', externalRoomId: 'M84V9RyJ' })
      await roomRepo.update('tenant-1', room.id, { status: 'active' })

      const getRoom = vi.fn(async () => {
        throw new ClubhouseApiError({ operation: 'getRoom', status: 500, kind: 'transient' })
      })
      const runtimeAdapter = { ...adapter, getRoom }
      vi.spyOn(botService, 'createAdapter').mockResolvedValue(runtimeAdapter as never)

      await botManager.startBot({ tenantId: 'tenant-1', botId: bot.id })

      // Persistent state is untouched and the bot keeps running.
      expect(getRoom).toHaveBeenCalledWith('M84V9RyJ')
      expect((await roomRepo.findByIdAndTenant(room.id, 'tenant-1'))?.status).toBe('active')
      expect((await botRepo.findByIdAndTenant(bot.id, 'tenant-1'))?.status).toBe('active')
      expect(adapter.joinRoom).not.toHaveBeenCalled()
      expect(adapter.ping).not.toHaveBeenCalled()
      expect(credentials.markInvalid).not.toHaveBeenCalled()

      // No timers are armed while the room existence is unconfirmed.
      const pingCalls = adapter.ping.mock.calls.length
      const syncCalls = adapter.getMessages.mock.calls.length
      await vi.advanceTimersByTimeAsync(600_000)
      expect(adapter.ping.mock.calls.length).toBe(pingCalls)
      expect(adapter.getMessages.mock.calls.length).toBe(syncCalls)
    } finally {
      vi.useRealTimers()
    }
  })

  it('startup reconciliation treats a 401 as a credential failure, not a missing room', async () => {
    const bot = await botRepo.create({ tenantId: 'tenant-1', name: 'Helper', platform: 'clubhouse' })
    const room = await roomRepo.create({ tenantId: 'tenant-1', botId: bot.id, platform: 'clubhouse', externalRoomId: 'M84V9RyJ' })
    await roomRepo.update('tenant-1', room.id, { status: 'active' })

    const getRoom = vi.fn(async () => {
      throw new ClubhouseApiError({ operation: 'getRoom', status: 401, kind: 'authentication' })
    })
    const runtimeAdapter = { ...adapter, getRoom }
    vi.spyOn(botService, 'createAdapter').mockResolvedValue(runtimeAdapter as never)

    await botManager.startBot({ tenantId: 'tenant-1', botId: bot.id })

    expect(credentials.markInvalid).toHaveBeenCalledWith('tenant-1', 'cred-1')
    expect((await roomRepo.findByIdAndTenant(room.id, 'tenant-1'))?.status).toBe('error')
    expect((await botRepo.findByIdAndTenant(bot.id, 'tenant-1'))?.status).toBe('error')
    expect(adapter.joinRoom).not.toHaveBeenCalled()
    expect(adapter.ping).not.toHaveBeenCalled()
  })

  it('runtime sync reports 404: deactivates the room and stops both timers without stopping the bot', async () => {
    vi.useFakeTimers()
    try {
      const bot = await botRepo.create({ tenantId: 'tenant-1', name: 'Helper', platform: 'clubhouse' })
      const room = await roomRepo.create({ tenantId: 'tenant-1', botId: bot.id, platform: 'clubhouse', externalRoomId: 'M84V9RyJ' })
      await roomRepo.update('tenant-1', room.id, { status: 'active' })

      const getMessages = vi.fn(async () => {
        throw new ClubhouseApiError({ operation: 'getMessages', status: 404, kind: 'not_found' })
      })
      const runtimeAdapter = { ...adapter, getMessages }
      vi.spyOn(botService, 'createAdapter').mockResolvedValue(runtimeAdapter as never)

      await botManager.startBot({ tenantId: 'tenant-1', botId: bot.id })
      expect((await roomRepo.findByIdAndTenant(room.id, 'tenant-1'))?.status).toBe('active')

      // First sync tick observes the room is gone.
      await vi.advanceTimersByTimeAsync(15_000)
      expect(getMessages).toHaveBeenCalledWith('M84V9RyJ')
      expect((await roomRepo.findByIdAndTenant(room.id, 'tenant-1'))?.status).toBe('inactive')

      // Both the sync and ping timers are stopped.
      const pingCalls = adapter.ping.mock.calls.length
      const syncCalls = getMessages.mock.calls.length
      await vi.advanceTimersByTimeAsync(600_000)
      expect(adapter.ping.mock.calls.length).toBe(pingCalls)
      expect(getMessages.mock.calls.length).toBe(syncCalls)

      // The bot keeps running.
      expect((await botRepo.findByIdAndTenant(bot.id, 'tenant-1'))?.status).toBe('active')
      expect(credentials.markInvalid).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('when one room disappears, only that room is deactivated; other rooms keep running', async () => {
    vi.useFakeTimers()
    try {
      const bot = await botRepo.create({ tenantId: 'tenant-1', name: 'Helper', platform: 'clubhouse' })
      const roomA = await roomRepo.create({ tenantId: 'tenant-1', botId: bot.id, platform: 'clubhouse', externalRoomId: 'extA' })
      const roomB = await roomRepo.create({ tenantId: 'tenant-1', botId: bot.id, platform: 'clubhouse', externalRoomId: 'extB' })
      await roomRepo.update('tenant-1', roomA.id, { status: 'active' })
      await roomRepo.update('tenant-1', roomB.id, { status: 'active' })

      const getMessages = vi.fn(async (externalRoomId: string) => {
        if (externalRoomId === 'extA') {
          throw new ClubhouseApiError({ operation: 'getMessages', status: 404, kind: 'not_found' })
        }
        return []
      })
      const runtimeAdapter = { ...adapter, getMessages }
      vi.spyOn(botService, 'createAdapter').mockResolvedValue(runtimeAdapter as never)

      await botManager.startBot({ tenantId: 'tenant-1', botId: bot.id })
      expect((await roomRepo.findByIdAndTenant(roomA.id, 'tenant-1'))?.status).toBe('active')
      expect((await roomRepo.findByIdAndTenant(roomB.id, 'tenant-1'))?.status).toBe('active')

      // First sync tick: Room A is gone, Room B still live.
      await vi.advanceTimersByTimeAsync(15_000)
      expect((await roomRepo.findByIdAndTenant(roomA.id, 'tenant-1'))?.status).toBe('inactive')
      expect((await roomRepo.findByIdAndTenant(roomB.id, 'tenant-1'))?.status).toBe('active')
      expect((await botRepo.findByIdAndTenant(bot.id, 'tenant-1'))?.status).toBe('active')

      const syncA = getMessages.mock.calls.filter(([id]) => id === 'extA').length
      const syncB = getMessages.mock.calls.filter(([id]) => id === 'extB').length
      const pingA = adapter.ping.mock.calls.filter(([id]) => id === 'extA').length
      const pingB = adapter.ping.mock.calls.filter(([id]) => id === 'extB').length

      await vi.advanceTimersByTimeAsync(180_000)
      expect(getMessages.mock.calls.filter(([id]) => id === 'extA').length).toBe(syncA)
      expect(getMessages.mock.calls.filter(([id]) => id === 'extB').length).toBe(syncB + 12)
      expect(adapter.ping.mock.calls.filter(([id]) => id === 'extA').length).toBe(pingA)
      expect(adapter.ping.mock.calls.filter(([id]) => id === 'extB').length).toBe(pingB + 1)
    } finally {
      vi.useRealTimers()
    }
  })
})
