/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type { UsageEvent, UsageEventCreateInput, UsageSummary, UsageType } from './usage.types.js'
import { UsageEventModel, toUsageEvent } from '../../models/usageEvent.js'

export interface UsageRepository {
  record: (input: UsageEventCreateInput) => Promise<UsageEvent>
  countByBotAndTypeAndTenant: (tenantId: string, botId: string, type: UsageType) => Promise<number>
  listByBotAndTenant: (tenantId: string, botId: string, limit?: number) => Promise<UsageEvent[]>
  summarizeByBotAndTenant: (tenantId: string, botId: string) => Promise<UsageSummary>
}

export class MongoUsageRepository implements UsageRepository {
  async record (input: UsageEventCreateInput): Promise<UsageEvent> {
    const doc = await UsageEventModel.create({
      tenantId: input.tenantId,
      botId: input.botId,
      roomId: input.roomId,
      type: input.type,
      meta: input.meta
    })
    return toUsageEvent(doc)
  }

  async countByBotAndTypeAndTenant (tenantId: string, botId: string, type: UsageType): Promise<number> {
    return await UsageEventModel.countDocuments({ tenantId, botId, type })
  }

  async listByBotAndTenant (tenantId: string, botId: string, limit = 50): Promise<UsageEvent[]> {
    const docs = await UsageEventModel.find({ tenantId, botId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean()
    return docs.map(toUsageEvent)
  }

  async summarizeByBotAndTenant (tenantId: string, botId: string): Promise<UsageSummary> {
    const count = async (type: UsageType): Promise<number> =>
      await this.countByBotAndTypeAndTenant(tenantId, botId, type)

    const [messages, aiResponses, aiRequests, speakerInvites, automationActions] =
      await Promise.all([
        count('message_received'),
        count('ai_response'),
        count('ai_request'),
        count('speaker_invite'),
        count('automation_triggered')
      ])

    // Distinct users approximated via room joins/leaves is not meaningful; we
    // expose a separate, simpler user count derived from room members below.
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

export const usageRepository: UsageRepository = new MongoUsageRepository()
