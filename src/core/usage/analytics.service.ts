/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type { UsageRepository } from './usage.repository.js'
import type { UsageSummary } from './usage.types.js'
import type { RoomRepository } from '../rooms/room.repository.js'
import type { RoomMemberRepository } from '../rooms/room-member.repository.js'

export interface AnalyticsServiceDeps {
  usage: UsageRepository
  rooms: RoomRepository
  members: RoomMemberRepository
}

/**
 * Composes the raw usage counters with the number of rooms and distinct users
 * seen by a bot to produce the basic analytics summary from spec §22. Kept
 * deliberately simple — no time-series bucketing in the MVP.
 */
export class AnalyticsService {
  constructor (private readonly deps: AnalyticsServiceDeps) {}

  async summarizeBot (tenantId: string, botId: string): Promise<UsageSummary> {
    const usage = await this.deps.usage.summarizeByBotAndTenant(tenantId, botId)
    const rooms = await this.deps.rooms.findByBotAndTenant(botId, tenantId)
    const roomIds = rooms.map((r) => r.id)
    const users = await this.deps.members.countDistinctUsers(roomIds)

    return {
      ...usage,
      rooms: rooms.length,
      users
    }
  }
}
