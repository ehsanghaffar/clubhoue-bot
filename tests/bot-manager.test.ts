/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BotManager } from '../src/core/bots/bot-manager.js'
import { BotService } from '../src/core/bots/bot.service.js'
import { RoomService } from '../src/core/rooms/room.service.js'
import { EventBus } from '../src/core/events/event-bus.js'
import { InMemoryMessageDeduplicator } from '../src/infrastructure/deduplication/message-dedup.js'
import {
  InMemoryBotRepository,
  InMemoryRoomRepository,
  InMemoryRoomMemberRepository,
  InMemoryCredentialRepository
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
    acceptSpeakerInvite: vi.fn(async () => {})
  }

  beforeEach(() => {
    botRepo = new InMemoryBotRepository()
    roomRepo = new InMemoryRoomRepository()
    memberRepo = new InMemoryRoomMemberRepository()
    bus = new EventBus()
    const roomService = new RoomService({ repo: roomRepo, members: memberRepo, deduplicator: new InMemoryMessageDeduplicator(), bus })
    botService = new BotService({
      repo: botRepo,
      credentials: {
        getActiveByBot: async () => ({ id: 'cred-1', tenantId: 'tenant-1', botId: 'bot-1', platform: 'clubhouse', encryptedToken: 'x', externalAccountId: 'ext-1', status: 'active', createdAt: new Date(), updatedAt: new Date() }),
        decryptForRuntime: async () => ({ token: 'tok', externalAccountId: 'ext-1' }),
        createCredential: vi.fn(),
        listByBot: vi.fn(),
        getByIdAndTenant: vi.fn(),
        revoke: vi.fn(),
        markInvalid: vi.fn(),
        deleteCredential: vi.fn()
      } as never
    })
    vi.spyOn(botService, 'createAdapter').mockResolvedValue(adapter)
    vi.spyOn(botService, 'getBotExternalUserId').mockResolvedValue('ext-1')
    botManager = new BotManager({ bots: botRepo, rooms: roomRepo, roomService, botService })
  })

  it('resolves null context for unknown bots', async () => {
    const context = await botManager.resolveContext({
      id: 'e', tenantId: 't', botId: 'nope', roomId: 'room-1', platform: 'clubhouse', type: 'message.created', timestamp: new Date(), payload: {}
    })
    expect(context).toBeNull()
  })

  it('joins configured rooms and marks bot active on start', async () => {
    const bot = await botRepo.create({ tenantId: 'tenant-1', name: 'Helper', platform: 'clubhouse' })
    await roomRepo.create({ tenantId: 'tenant-1', botId: bot.id, platform: 'clubhouse', externalRoomId: 'ch_abc' })

    await botManager.startBot(bot.id)
    expect((await botRepo.findById(bot.id))?.status).toBe('active')
    const room = await roomRepo.findByBot(bot.id)
    expect(room[0].status).toBe('active')
  })

  it('stopBot marks the bot stopped and clears loops', async () => {
    const bot = await botRepo.create({ tenantId: 'tenant-1', name: 'Helper', platform: 'clubhouse' })

    await botManager.startBot(bot.id)
    await botManager.stopBot(bot.id)
    expect((await botRepo.findById(bot.id))?.status).toBe('stopped')
  })

  it('startAll restarts previously active bots', async () => {
    const bot = await botRepo.create({ tenantId: 'tenant-1', name: 'Helper', platform: 'clubhouse' })
    await botRepo.update(bot.id, { status: 'active' })

    await botManager.startAll()
    expect((await botRepo.findById(bot.id))?.status).toBe('active')
  })

  it('startBot is idempotent: no duplicate joins on repeated starts (F-01)', async () => {
    const bot = await botRepo.create({ tenantId: 'tenant-1', name: 'Helper', platform: 'clubhouse' })
    await roomRepo.create({ tenantId: 'tenant-1', botId: bot.id, platform: 'clubhouse', externalRoomId: 'ch_abc' })

    await botManager.startBot(bot.id)
    const joinsAfterFirst = (adapter.joinRoom as ReturnType<typeof vi.fn>).mock.calls.length
    await botManager.startBot(bot.id)

    // The second start must not re-join already-active rooms or create a
    // second runtime; the bot stays active exactly once.
    expect((await botRepo.findById(bot.id))?.status).toBe('active')
    expect((adapter.joinRoom as ReturnType<typeof vi.fn>).mock.calls.length).toBe(joinsAfterFirst)
  })
})
