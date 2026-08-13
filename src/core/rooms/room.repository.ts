/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type { BotRoom, BotRoomCreateInput, BotRoomSettings, BotRoomStatus } from './room.types.js'
import { BotRoomModel, toBotRoom } from '../../models/botRoom.js'
import { resolveRoomSettings } from './room.types.js'

export interface RoomUpdateInput {
  status?: BotRoomStatus
  settings?: Partial<BotRoomSettings>
  joinedAt?: Date | null
  lastSeenAt?: Date
}

export interface RoomRepository {
  create: (input: BotRoomCreateInput) => Promise<BotRoom>
  findById: (id: string) => Promise<BotRoom | null>
  findByIdAndTenant: (id: string, tenantId: string) => Promise<BotRoom | null>
  findByIdAndTenantAndBot: (id: string, tenantId: string, botId: string) => Promise<BotRoom | null>
  findByBot: (botId: string) => Promise<BotRoom[]>
  findByBotAndTenant: (botId: string, tenantId: string) => Promise<BotRoom[]>
  findByExternalRoomId: (tenantId: string, botId: string, externalRoomId: string) => Promise<BotRoom | null>
  findByStatus: (status: BotRoomStatus) => Promise<BotRoom[]>
  findByTenantAndStatus: (tenantId: string, status: BotRoomStatus) => Promise<BotRoom[]>
  update: (tenantId: string, id: string, patch: RoomUpdateInput) => Promise<BotRoom | null>
  delete: (tenantId: string, id: string) => Promise<void>
}

export class MongoRoomRepository implements RoomRepository {
  async create (input: BotRoomCreateInput): Promise<BotRoom> {
    const doc = await BotRoomModel.create({
      tenantId: input.tenantId,
      botId: input.botId,
      platform: input.platform,
      externalRoomId: input.externalRoomId,
      settings: resolveRoomSettings(input.settings)
    })
    return toBotRoom(doc)
  }

  async findById (id: string): Promise<BotRoom | null> {
    const doc = await BotRoomModel.findById(id).lean()
    return doc == null ? null : toBotRoom(doc)
  }

  async findByIdAndTenant (id: string, tenantId: string): Promise<BotRoom | null> {
    const doc = await BotRoomModel.findOne({ _id: id, tenantId }).lean()
    return doc == null ? null : toBotRoom(doc)
  }

  async findByIdAndTenantAndBot (id: string, tenantId: string, botId: string): Promise<BotRoom | null> {
    const doc = await BotRoomModel.findOne({ _id: id, tenantId, botId }).lean()
    return doc == null ? null : toBotRoom(doc)
  }

  async findByBot (botId: string): Promise<BotRoom[]> {
    const docs = await BotRoomModel.find({ botId }).sort({ createdAt: -1 }).lean()
    return docs.map(toBotRoom)
  }

  async findByBotAndTenant (botId: string, tenantId: string): Promise<BotRoom[]> {
    const docs = await BotRoomModel.find({ botId, tenantId }).sort({ createdAt: -1 }).lean()
    return docs.map(toBotRoom)
  }

  async findByExternalRoomId (tenantId: string, botId: string, externalRoomId: string): Promise<BotRoom | null> {
    const doc = await BotRoomModel.findOne({ tenantId, botId, externalRoomId }).lean()
    return doc == null ? null : toBotRoom(doc)
  }

  async findByStatus (status: BotRoomStatus): Promise<BotRoom[]> {
    const docs = await BotRoomModel.find({ status }).lean()
    return docs.map(toBotRoom)
  }

  async findByTenantAndStatus (tenantId: string, status: BotRoomStatus): Promise<BotRoom[]> {
    const docs = await BotRoomModel.find({ tenantId, status }).lean()
    return docs.map(toBotRoom)
  }

  async update (tenantId: string, id: string, patch: RoomUpdateInput): Promise<BotRoom | null> {
    const update: Record<string, unknown> = { ...patch }
    if (patch.settings != null) {
      // Merge settings subdocument instead of replacing wholesale.
      const current = await BotRoomModel.findOne({ _id: id, tenantId }).lean()
      update.settings = { ...(current?.settings ?? {}), ...patch.settings }
    }
    const doc = await BotRoomModel.findOneAndUpdate(
      { _id: id, tenantId },
      update,
      { new: true }
    ).lean()
    return doc == null ? null : toBotRoom(doc)
  }

  async delete (tenantId: string, id: string): Promise<void> {
    await BotRoomModel.deleteOne({ _id: id, tenantId })
  }
}

export const roomRepository: RoomRepository = new MongoRoomRepository()
