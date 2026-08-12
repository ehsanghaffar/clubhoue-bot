/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EventBus } from '../src/core/events/event-bus.js'
import { RoomService } from '../src/core/rooms/room.service.js'
import { InMemoryEventStore } from '../src/core/events/event-store.memory.js'
import { InMemoryMessageDeduplicator } from '../src/infrastructure/deduplication/message-dedup.js'
import { InMemoryRoomRepository, InMemoryRoomMemberRepository } from './helpers/in-memory.js'
import type { BotRoom } from '../src/core/rooms/room.types.js'
import type { Message, Room, User } from '../src/core/types.js'
import type { CommunityPlatformAdapter } from '../src/platforms/adapter.js'

const makeRoom = (overrides: Partial<BotRoom> = {}): BotRoom => ({
  id: 'room-1',
  tenantId: 'tenant-1',
  botId: 'bot-1',
  platform: 'clubhouse',
  externalRoomId: 'ch_abc',
  status: 'active',
  settings: { welcomeEnabled: true, aiEnabled: true, autoInviteEnabled: false, moderationEnabled: false },
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
})

const makeAdapter = (messages: Message[] = []): CommunityPlatformAdapter => ({
  platform: 'clubhouse',
  getRoom: vi.fn(async (): Promise<Room> => ({ id: 'ch_abc', platform: 'clubhouse' })),
  joinRoom: vi.fn(async () => {}),
  leaveRoom: vi.fn(async () => {}),
  getMessages: vi.fn(async (): Promise<Message[]> => messages),
  sendMessage: vi.fn(async () => {}),
  getUser: vi.fn(async (): Promise<User> => ({ id: 'u-1', platform: 'clubhouse' })),
  searchUsers: vi.fn(async (): Promise<User[]> => []),
  inviteSpeaker: vi.fn(async () => {}),
  acceptSpeakerInvite: vi.fn(async () => {})
})

describe('RoomService', () => {
  let repo: InMemoryRoomRepository
  let members: InMemoryRoomMemberRepository
  let dedup: InMemoryMessageDeduplicator
  let bus: EventBus
  let service: RoomService

  beforeEach(() => {
    repo = new InMemoryRoomRepository()
    members = new InMemoryRoomMemberRepository()
    dedup = new InMemoryMessageDeduplicator()
    bus = new EventBus()
    service = new RoomService({ repo, members, deduplicator: dedup, bus, eventStore: new InMemoryEventStore() })
  })

  it('creates a room with resolved settings', async () => {
    const room = await service.createRoom({
      tenantId: 'tenant-1',
      botId: 'bot-1',
      platform: 'clubhouse',
      externalRoomId: 'ch_xyz',
      settings: { autoInviteEnabled: true }
    })
    expect(room.id).toBeDefined()
    expect(room.settings.autoInviteEnabled).toBe(true)
    expect(room.settings.welcomeEnabled).toBe(true)
  })

  it('joins a room and publishes room.joined', async () => {
    const adapter = makeAdapter()
    const room = await repo.create({
      tenantId: 'tenant-1',
      botId: 'bot-1',
      platform: 'clubhouse',
      externalRoomId: 'ch_abc'
    })
    const seen: string[] = []
    bus.subscribeAll((e) => { seen.push(e.type) })

    await service.join(room, adapter)
    expect(adapter.joinRoom).toHaveBeenCalledWith('ch_abc')
    expect(seen).toContain('room.joined')
    const updated = await repo.findById(room.id)
    expect(updated?.status).toBe('active')
    expect(updated?.joinedAt).toBeDefined()
  })

  it('leaves a room and marks it inactive', async () => {
    const adapter = makeAdapter()
    const room = await repo.create({
      tenantId: 'tenant-1',
      botId: 'bot-1',
      platform: 'clubhouse',
      externalRoomId: 'ch_abc'
    })
    const seen: string[] = []
    bus.subscribeAll((e) => { seen.push(e.type) })

    await service.leave(room, adapter)
    expect(adapter.leaveRoom).toHaveBeenCalledWith('ch_abc')
    expect(seen).toContain('room.left')
    const updated = await repo.findById(room.id)
    expect(updated?.status).toBe('inactive')
  })

  it('publishes message.created only for new messages (dedup)', async () => {
    const messages: Message[] = [
      { id: 'm-1', roomId: 'room-1', userId: 'u-1', content: 'hello', timestamp: new Date() },
      { id: 'm-2', roomId: 'room-1', userId: 'u-2', content: 'hi there', timestamp: new Date() }
    ]
    const adapter = makeAdapter(messages)
    const seen: string[] = []
    bus.subscribe('message.created', (e) => { seen.push((e.payload as { messageId: string }).messageId) })

    const count1 = await service.syncRoom(makeRoom(), adapter)
    const count2 = await service.syncRoom(makeRoom(), adapter)

    expect(count1).toBe(2)
    expect(count2).toBe(0)
    expect(seen).toEqual(['m-1', 'm-2'])
  })

  it('publishes user.joined only for first sighting of a member', async () => {
    const messages: Message[] = [
      { id: 'm-1', roomId: 'room-1', userId: 'u-1', content: 'a', timestamp: new Date() },
      { id: 'm-2', roomId: 'room-1', userId: 'u-1', content: 'b', timestamp: new Date() },
      { id: 'm-3', roomId: 'room-1', userId: 'u-2', content: 'c', timestamp: new Date() }
    ]
    const adapter = makeAdapter(messages)
    const joined: string[] = []
    bus.subscribe('user.joined', (e) => { joined.push((e.payload as { userId: string }).userId) })

    await service.syncRoom(makeRoom(), adapter)
    expect(joined).toEqual(['u-1', 'u-2'])
  })
})
