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
import type { UsageEvent, UsageEventCreateInput, UsageSummary, UsageType } from '../../src/core/usage/usage.types.js'
import type { UsageRepository } from '../../src/core/usage/usage.repository.js'
import type { Tenant, TenantCreateInput, TenantUpdateInput } from '../../src/core/tenants/tenant.types.js'
import type { TenantRepository } from '../../src/core/tenants/tenant.repository.js'

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

  async update (tenantId: string, id: string, patch: BotUpdateInput): Promise<Bot | null> {
    const row = this.rows.get(id)
    if (row == null || row.tenantId !== tenantId) return null
    const updated = { ...row, ...patch, updatedAt: new Date() }
    this.rows.set(id, updated)
    return clone(updated)
  }

  async delete (tenantId: string, id: string): Promise<void> {
    const row = this.rows.get(id)
    if (row != null && row.tenantId === tenantId) this.rows.delete(id)
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

  async update (tenantId: string, id: string, patch: RoomUpdateInput): Promise<BotRoom | null> {
    const row = this.rows.get(id)
    if (row == null || row.tenantId !== tenantId) return null
    const updated = {
      ...row,
      ...patch,
      settings: patch.settings != null ? { ...row.settings, ...patch.settings } : row.settings,
      updatedAt: new Date()
    }
    this.rows.set(id, updated)
    return clone(updated)
  }

  async delete (tenantId: string, id: string): Promise<void> {
    const row = this.rows.get(id)
    if (row != null && row.tenantId === tenantId) this.rows.delete(id)
  }
}

export class InMemoryRoomMemberRepository implements RoomMemberRepository {
  private readonly byRoom = new Map<string, Set<string>>()

  async ensureSeen (roomId: string, userId: string, _displayName?: string): Promise<RoomMemberSeenResult> {
    let users = this.byRoom.get(roomId)
    if (users == null) {
      users = new Set()
      this.byRoom.set(roomId, users)
    }
    if (users.has(userId)) {
      return { isNew: false }
    }
    users.add(userId)
    return { isNew: true }
  }

  async countDistinctUsers (roomIds: string[]): Promise<number> {
    const distinct = new Set<string>()
    for (const roomId of roomIds) {
      for (const userId of this.byRoom.get(roomId) ?? []) {
        distinct.add(userId)
      }
    }
    return distinct.size
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

  async findActiveByBot (tenantId: string, botId: string): Promise<BotCredential | null> {
    const rows = [...this.rows.values()].filter((c) => c.tenantId === tenantId && c.botId === botId && c.status === 'active')
    return rows.length > 0 ? clone(rows[rows.length - 1]) : null
  }

  async findByBot (botId: string): Promise<BotCredential[]> {
    return [...this.rows.values()].filter((c) => c.botId === botId).map(clone)
  }

  async findByTenant (tenantId: string): Promise<BotCredential[]> {
    return [...this.rows.values()].filter((c) => c.tenantId === tenantId).map(clone)
  }

  async update (tenantId: string, id: string, patch: { status?: string }): Promise<BotCredential | null> {
    const row = this.rows.get(id)
    if (row == null || row.tenantId !== tenantId) return null
    const updated = { ...row, ...patch, updatedAt: new Date() } as BotCredential
    this.rows.set(id, updated)
    return clone(updated)
  }

  async delete (tenantId: string, id: string): Promise<void> {
    const row = this.rows.get(id)
    if (row != null && row.tenantId === tenantId) this.rows.delete(id)
  }
}

export class InMemoryUsageRepository implements UsageRepository {
  private readonly rows: Array<{ event: UsageEvent; seq: number }> = []
  private seq = 0

  async record (input: UsageEventCreateInput): Promise<UsageEvent> {
    const event: UsageEvent = {
      id: `usage_${++this.seq}`,
      tenantId: input.tenantId,
      botId: input.botId,
      roomId: input.roomId,
      type: input.type,
      timestamp: new Date(),
      meta: input.meta
    }
    this.rows.push({ event: clone(event), seq: this.seq })
    return clone(event)
  }

  async countByBotAndType (botId: string, type: UsageType): Promise<number> {
    return this.rows.filter((r) => r.event.botId === botId && r.event.type === type).length
  }

  async listByBot (botId: string, limit = 50): Promise<UsageEvent[]> {
    return [...this.rows]
      .filter((r) => r.event.botId === botId)
      .sort((a, b) => b.seq - a.seq)
      .slice(0, limit)
      .map((r) => clone(r.event))
  }

  async summarize (botId: string): Promise<UsageSummary> {
    const count = async (type: UsageType): Promise<number> => await this.countByBotAndType(botId, type)
    const [messages, aiResponses, aiRequests, speakerInvites, automationActions] = await Promise.all([
      count('message_received'),
      count('ai_response'),
      count('ai_request'),
      count('speaker_invite'),
      count('automation_triggered')
    ])
    return {
      messages,
      aiResponses,
      aiRequests,
      users: 0,
      rooms: 0,
      speakerInvites,
      automationActions,
      errors: 0
    }
  }
}

export class InMemoryTenantRepository implements TenantRepository {
  private readonly rows = new Map<string, Tenant>()
  private seq = 0

  async create (input: TenantCreateInput): Promise<Tenant> {
    const now = new Date()
    const tenant: Tenant = {
      id: `tenant_${++this.seq}`,
      name: input.name,
      status: 'active',
      apiKeys: input.apiKeys ?? [],
      createdAt: now,
      updatedAt: now
    }
    this.rows.set(tenant.id, clone(tenant))
    return clone(tenant)
  }

  async findById (id: string): Promise<Tenant | null> {
    const row = this.rows.get(id)
    return row == null ? null : clone(row)
  }

  async findByApiKey (apiKey: string): Promise<Tenant | null> {
    const row = [...this.rows.values()].find((t) => t.apiKeys.includes(apiKey))
    return row == null ? null : clone(row)
  }

  async update (id: string, patch: TenantUpdateInput): Promise<Tenant | null> {
    const row = this.rows.get(id)
    if (row == null) return null
    const updated = { ...row, ...patch, updatedAt: new Date() } as Tenant
    this.rows.set(id, updated)
    return clone(updated)
  }
}
