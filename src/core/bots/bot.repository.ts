/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type { AiConfig, Bot, BotCreateInput, BotStatus } from './bot.types.js'
import { BotModel, toBot } from '../../models/bot.js'
import { resolveAiConfig } from './bot.types.js'

export interface BotUpdateInput {
  name?: string
  status?: BotStatus
  aiConfig?: AiConfig
  personality?: string
  welcomeMessage?: string
}

export interface BotRepository {
  create: (input: BotCreateInput) => Promise<Bot>
  findById: (id: string) => Promise<Bot | null>
  findByIdAndTenant: (id: string, tenantId: string) => Promise<Bot | null>
  findByTenant: (tenantId: string) => Promise<Bot[]>
  findByStatus: (status: BotStatus) => Promise<Bot[]>
  update: (id: string, patch: BotUpdateInput) => Promise<Bot | null>
  delete: (id: string) => Promise<void>
}

export class MongoBotRepository implements BotRepository {
  async create (input: BotCreateInput): Promise<Bot> {
    const doc = await BotModel.create({
      tenantId: input.tenantId,
      name: input.name,
      platform: input.platform,
      aiConfig: resolveAiConfig(input.aiConfig),
      personality: input.personality,
      welcomeMessage: input.welcomeMessage
    })
    return toBot(doc)
  }

  async findById (id: string): Promise<Bot | null> {
    const doc = await BotModel.findById(id).lean()
    return doc == null ? null : toBot(doc)
  }

  async findByIdAndTenant (id: string, tenantId: string): Promise<Bot | null> {
    const doc = await BotModel.findOne({ _id: id, tenantId }).lean()
    return doc == null ? null : toBot(doc)
  }

  async findByTenant (tenantId: string): Promise<Bot[]> {
    const docs = await BotModel.find({ tenantId }).sort({ createdAt: -1 }).lean()
    return docs.map(toBot)
  }

  async findByStatus (status: BotStatus): Promise<Bot[]> {
    const docs = await BotModel.find({ status }).lean()
    return docs.map(toBot)
  }

  async update (id: string, patch: BotUpdateInput): Promise<Bot | null> {
    const doc = await BotModel.findByIdAndUpdate(id, patch, { new: true }).lean()
    return doc == null ? null : toBot(doc)
  }

  async delete (id: string): Promise<void> {
    await BotModel.deleteOne({ _id: id })
  }
}

export const botRepository: BotRepository = new MongoBotRepository()
