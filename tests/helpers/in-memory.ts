/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */

/**
 * In-memory implementations of the core repositories for offline unit tests.
 * Each mirrors the Mongo repository interface so services can be tested with
 * identical dependency shapes.
 */
import type { Bot } from '../../src/core/bots/bot.types.js'
import type { BotCreateInput } from '../../src/core/bots/bot.types.js'
import type { BotRepository, BotUpdateInput } from '../../src/core/bots/bot.repository.js'
import type { BotRoom, BotRoomCreateInput } from '../../src/core/rooms/room.types.js'
import type { RoomRepository, RoomUpdateInput } from '../../src/core/rooms/room.repository.js'
import type { RoomMemberRepository, RoomMemberSeenResult } from '../../src/core/rooms/room-member.repository.js'
import type { BotCredential, BotCredentialCreateInput } from '../../src/core/credentials/credential.types.js'
import type { CredentialRepository } from '../../src/core/credentials/credential.repository.js'

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

export class InMemoryBotRepository implements BotRepository {
  private readonly rows = new Map<string, Bot>()
  private seq = 0

  async create (input: BotCreateInput): Promise<Bot> {
    const now = new Date()
    const bot: Bot = {
      id: `bot_${++this.seq}`,
      tenantId: input.tenantId,
      name: input.name,
      platform: input.platform,
      status: 'created',
      aiConfig: input.aiConfig ?? { enabled: true, model: 'gpt-4o-mini', temperature: 0.4, maxOutputTokens: 150, maxResponseLength: 280, triggerMode: 'question', triggerPrefix: '#', cooldownSeconds: 30 },
      personality: input.personality,
      welcomeMessage: input.welcomeMessage,
      createdAt: now,
      updatedAt: now
    }
    this.rows.set(bot.id, clone(bot))
    return clone(bot)
  }

  async findById (id: string): Promise<Bot | null> {
    const row = this.rows.get(id)
    return row == null ? null : clone(row)
  }

  async findByIdAndTenant (id: string, tenantId: string): Promise<Bot | null> {
    const row = this.rows.get(id)
    return row != null && row.tenantId === tenantId ? clone(row) : null
  }

  async findByTenant (tenantId: string): Promise<Bot[]> {
    return [...this.rows.values()].filter((b) => b.tenantId === tenantId).map(clone)
  }

  async findByStatus (status: string): Promise<Bot[]> {
    return [...this.rows.values()].filter((b) => b.status === status).map(clone)
  }

  async update (id: string, patch: BotUpdateInput): Promise<Bot | null> {
    const row = this.rows.get(id)
    if (row == null) return null
    const updated = { ...row, ...patch, updatedAt: new Date() }
    this.rows.set(id, updated)
    return clone(updated)
  }

  async delete (id: string): Promise<void> {
    this.rows.delete(id)
  }
}

export class InMemoryRoomRepository implements RoomRepository {
  private readonly rows = new Map<string, BotRoom>()
  private seq = 0

  async create (input: BotRoomCreateInput): Promise<BotRoom> {
    const now = new Date()
    const room: BotRoom = {
      id: `room_${++this.seq}`,
      tenantId: input.tenantId,
      botId: input.botId,
      platform: input.platform,
      externalRoomId: input.externalRoomId,
      status: 'configured',
      settings: {
        welcomeEnabled: true,
        aiEnabled: true,
        autoInviteEnabled: false,
        moderationEnabled: false,
        ...input.settings
      },
      createdAt: now,
      updatedAt: now
    }
    this.rows.set(room.id, clone(room))
    return clone(room)
  }

  async findById (id: string): Promise<BotRoom | null> {
    const row = this.rows.get(id)
    return row == null ? null : clone(row)
  }

  async findByIdAndTenant (id: string, tenantId: string): Promise<BotRoom | null> {
    const row = this.rows.get(id)
    return row != null && row.tenantId === tenantId ? clone(row) : null
  }

  async findByIdAndTenantAndBot (id: string, tenantId: string, botId: string): Promise<BotRoom | null> {
    const row = this.rows.get(id)
    return row != null && row.tenantId === tenantId && row.botId === botId ? clone(row) : null
  }

  async findByBot (botId: string): Promise<BotRoom[]> {
    return [...this.rows.values()].filter((r) => r.botId === botId).map(clone)
  }

  async findByBotAndTenant (botId: string, tenantId: string): Promise<BotRoom[]> {
    return [...this.rows.values()].filter((r) => r.botId === botId && r.tenantId === tenantId).map(clone)
  }

  async findByStatus (status: string): Promise<BotRoom[]> {
    return [...this.rows.values()].filter((r) => r.status === status).map(clone)
  }

  async findByTenantAndStatus (tenantId: string, status: string): Promise<BotRoom[]> {
    return [...this.rows.values()].filter((r) => r.tenantId === tenantId && r.status === status).map(clone)
  }

  async update (id: string, patch: RoomUpdateInput): Promise<BotRoom | null> {
    const row = this.rows.get(id)
    if (row == null) return null
    const updated = {
      ...row,
      ...patch,
      settings: patch.settings != null ? { ...row.settings, ...patch.settings } : row.settings,
      updatedAt: new Date()
    }
    this.rows.set(id, updated)
    return clone(updated)
  }

  async delete (id: string): Promise<void> {
    this.rows.delete(id)
  }
}

export class InMemoryRoomMemberRepository implements RoomMemberRepository {
  private readonly members = new Set<string>()

  async ensureSeen (roomId: string, userId: string, _displayName?: string): Promise<RoomMemberSeenResult> {
    const key = `${roomId}:${userId}`
    if (this.members.has(key)) {
      return { isNew: false }
    }
    this.members.add(key)
    return { isNew: true }
  }
}

export class InMemoryCredentialRepository implements CredentialRepository {
  private readonly rows = new Map<string, BotCredential>()
  private seq = 0

  async create (input: BotCredentialCreateInput): Promise<BotCredential> {
    const now = new Date()
    const credential: BotCredential = {
      id: `cred_${++this.seq}`,
      tenantId: input.tenantId,
      botId: input.botId,
      platform: input.platform,
      encryptedToken: input.encryptedToken,
      externalAccountId: input.externalAccountId,
      externalAccountName: input.externalAccountName,
      status: 'active',
      createdAt: now,
      updatedAt: now
    }
    this.rows.set(credential.id, clone(credential))
    return clone(credential)
  }

  async findById (id: string): Promise<BotCredential | null> {
    const row = this.rows.get(id)
    return row == null ? null : clone(row)
  }

  async findByIdAndTenant (id: string, tenantId: string): Promise<BotCredential | null> {
    const row = this.rows.get(id)
    return row != null && row.tenantId === tenantId ? clone(row) : null
  }

  async findActiveByBot (botId: string): Promise<BotCredential | null> {
    const rows = [...this.rows.values()].filter((c) => c.botId === botId && c.status === 'active')
    return rows.length > 0 ? clone(rows[rows.length - 1]) : null
  }

  async findByBot (botId: string): Promise<BotCredential[]> {
    return [...this.rows.values()].filter((c) => c.botId === botId).map(clone)
  }

  async findByTenant (tenantId: string): Promise<BotCredential[]> {
    return [...this.rows.values()].filter((c) => c.tenantId === tenantId).map(clone)
  }

  async update (id: string, patch: { status?: string }): Promise<BotCredential | null> {
    const row = this.rows.get(id)
    if (row == null) return null
    const updated = { ...row, ...patch, updatedAt: new Date() } as BotCredential
    this.rows.set(id, updated)
    return clone(updated)
  }

  async delete (id: string): Promise<void> {
    this.rows.delete(id)
  }
}
