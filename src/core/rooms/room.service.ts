/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { nanoid } from 'nanoid'
import type { BotRoom, BotRoomCreateInput, BotRoomSettings } from './room.types.js'
import type { RoomRepository, RoomUpdateInput } from './room.repository.js'
import type { RoomMemberRepository } from './room-member.repository.js'
import type { MessageDeduplicator } from '../../infrastructure/deduplication/message-dedup.js'
import type { EventBus } from '../events/event-bus.js'
import type { CommunityPlatformAdapter } from '../../platforms/adapter.js'

export interface RoomServiceDeps {
  repo: RoomRepository
  members: RoomMemberRepository
  deduplicator: MessageDeduplicator
  bus: EventBus
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

  async updateSettings (id: string, settings: Partial<BotRoomSettings>): Promise<BotRoom | null> {
    return await this.deps.repo.update(id, { settings })
  }

  async update (id: string, patch: RoomUpdateInput): Promise<BotRoom | null> {
    return await this.deps.repo.update(id, patch)
  }

  async deleteRoom (id: string): Promise<void> {
    await this.deps.repo.delete(id)
  }

  /** Joins the room on the platform and marks it active. */
  async join (room: BotRoom, adapter: CommunityPlatformAdapter): Promise<void> {
    await adapter.joinRoom(room.externalRoomId)
    await this.deps.repo.update(room.id, {
      status: 'active',
      joinedAt: new Date(),
      lastSeenAt: new Date()
    })
    this.publish(room, 'room.joined', { roomId: room.id })
  }

  /** Leaves the room on the platform and marks it inactive. */
  async leave (room: BotRoom, adapter: CommunityPlatformAdapter): Promise<void> {
    try {
      await adapter.leaveRoom(room.externalRoomId)
    } finally {
      await this.deps.repo.update(room.id, { status: 'inactive', lastSeenAt: new Date() })
      this.publish(room, 'room.left', { roomId: room.id })
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
          this.publish(room, 'user.joined', { userId: message.userId })
        }
      }

      this.publish(room, 'message.created', {
        messageId: message.id,
        userId: message.userId,
        content: message.content,
        timestamp: message.timestamp
      })
    }

    await this.deps.repo.update(room.id, { lastSeenAt: new Date() })
    return newCount
  }

  private publish (
    room: BotRoom,
    type: 'room.joined' | 'room.left' | 'user.joined' | 'message.created',
    payload: Record<string, unknown>
  ): void {
    this.deps.bus.publish({
      id: nanoid(12),
      tenantId: room.tenantId,
      botId: room.botId,
      roomId: room.id,
      platform: room.platform,
      type,
      timestamp: new Date(),
      payload
    })
  }
}
