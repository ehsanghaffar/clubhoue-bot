/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type { BotRoom, BotRoomCreateInput, BotRoomSettings } from './room.types.js'
import type { RoomRepository, RoomUpdateInput } from './room.repository.js'
import type { RoomMemberRepository } from './room-member.repository.js'
import type { MessageDeduplicator } from '../../infrastructure/deduplication/message-dedup.js'
import type { EventBus } from '../events/event-bus.js'
import type { EventStore } from '../events/event-store.js'
import type { CommunityPlatformAdapter } from '../../platforms/adapter.js'
import { deriveEventId } from '../events/event.types.js'

export interface RoomServiceDeps {
  repo: RoomRepository
  members: RoomMemberRepository
  deduplicator: MessageDeduplicator
  bus: EventBus
  eventStore: EventStore
}

/**
 * Orchestrates bot rooms: CRUD, join/leave lifecycle, and the message sync
 * pipeline (fetch -> dedup -> track members -> publish normalized events).
 */
export class RoomService {
  constructor (private readonly deps: RoomServiceDeps) {}

  async createRoom (input: BotRoomCreateInput): Promise<BotRoom> {
    return await this.deps.repo.create(input)
  }

  async findByIdAndTenantAndBot (id: string, tenantId: string, botId: string): Promise<BotRoom | null> {
    return await this.deps.repo.findByIdAndTenantAndBot(id, tenantId, botId)
  }

  async listByBotAndTenant (botId: string, tenantId: string): Promise<BotRoom[]> {
    return await this.deps.repo.findByBotAndTenant(botId, tenantId)
  }

  async listActiveByTenant (tenantId: string): Promise<BotRoom[]> {
    return await this.deps.repo.findByTenantAndStatus(tenantId, 'active')
  }

  async updateSettings (tenantId: string, id: string, settings: Partial<BotRoomSettings>): Promise<BotRoom | null> {
    return await this.deps.repo.update(tenantId, id, { settings })
  }

  async update (tenantId: string, id: string, patch: RoomUpdateInput): Promise<BotRoom | null> {
    return await this.deps.repo.update(tenantId, id, patch)
  }

  async deleteRoom (tenantId: string, id: string): Promise<void> {
    await this.deps.repo.delete(tenantId, id)
  }

  /** Joins the room on the platform and marks it active. */
  async join (room: BotRoom, adapter: CommunityPlatformAdapter): Promise<void> {
    await adapter.joinRoom(room.externalRoomId)
    await this.deps.repo.update(room.tenantId, room.id, {
      status: 'active',
      joinedAt: new Date(),
      lastSeenAt: new Date()
    })
    await this.publish(room, 'room.joined', { roomId: room.id })
  }

  /** Leaves the room on the platform and marks it inactive. */
  async leave (room: BotRoom, adapter: CommunityPlatformAdapter): Promise<void> {
    try {
      await adapter.leaveRoom(room.externalRoomId)
    } finally {
      await this.deps.repo.update(room.tenantId, room.id, { status: 'inactive', lastSeenAt: new Date() })
      await this.publish(room, 'room.left', { roomId: room.id })
    }
  }

  /**
   * Fetches the latest messages, marks them processed (persistent dedup), and
   * publishes normalized events for each new message and newly-seen member.
   * Returns how many new messages were processed.
   */
  async syncRoom (room: BotRoom, adapter: CommunityPlatformAdapter): Promise<number> {
    const messages = await adapter.getMessages(room.externalRoomId)
    let newCount = 0

    for (const message of messages) {
      const processed = await this.deps.deduplicator.isProcessed(room.botId, room.id, message.id)
      if (processed) {
        continue
      }
      await this.deps.deduplicator.markProcessed(room.botId, room.id, message.id)
      newCount += 1

      if (message.userId !== '') {
        const seen = await this.deps.members.ensureSeen(room.id, message.userId)
        if (seen.isNew) {
          await this.publish(room, 'user.joined', { userId: message.userId })
        }
      }

      await this.publish(room, 'message.created', {
        messageId: message.id,
        userId: message.userId,
        content: message.content,
        timestamp: message.timestamp
      })
    }

    await this.deps.repo.update(room.tenantId, room.id, { lastSeenAt: new Date() })
    return newCount
  }

  /**
   * Emits a normalized community event. The durable store is written FIRST;
   * only after the event is durably persisted do we dispatch it to the
   * in-memory bus for the realtime pipeline. This ordering is the crash-safety
   * invariant: a process crash can never lose an event it already accepted.
   */
  private async publish (
    room: BotRoom,
    type: 'room.joined' | 'room.left' | 'user.joined' | 'message.created',
    payload: Record<string, unknown>
  ): Promise<void> {
    const event = {
      id: deriveEventId(type, room.id, payload),
      tenantId: room.tenantId,
      botId: room.botId,
      roomId: room.id,
      platform: room.platform,
      type,
      timestamp: new Date(),
      payload
    }
    await this.deps.eventStore.persist(event)
    this.deps.bus.publish(event)
  }
}
