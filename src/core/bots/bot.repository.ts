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
  findByIdAndTenant: (id: string, tenantId: string) => Promise<Bot | null>
  findByTenant: (tenantId: string) => Promise<Bot[]>
  /**
   * Intentionally global, not tenant-scoped: used by the bot manager to
   * restart every active bot on process boot. No request path reaches this.
   */
  findByStatus: (status: BotStatus) => Promise<Bot[]>
  update: (tenantId: string, id: string, patch: BotUpdateInput) => Promise<Bot | null>
  delete: (tenantId: string, id: string) => Promise<void>
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

  async update (tenantId: string, id: string, patch: BotUpdateInput): Promise<Bot | null> {
    const doc = await BotModel.findOneAndUpdate(
      { _id: id, tenantId },
      patch,
      { new: true }
    ).lean()
    return doc == null ? null : toBot(doc)
  }

  async delete (tenantId: string, id: string): Promise<void> {
    await BotModel.deleteOne({ _id: id, tenantId })
  }
}

export const botRepository: BotRepository = new MongoBotRepository()
