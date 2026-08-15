/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */

/**
 * Usage + analytics: append-only telemetry events feeding per-bot summaries
 * and the basic analytics endpoint.
 */
import { usageRepository } from './usage.repository.js'
import { roomRepository } from '../rooms/room.repository.js'
import { roomMemberRepository } from '../rooms/room-member.repository.js'
import { UsageService } from './usage.service.js'
import { AnalyticsService } from './analytics.service.js'
import { UsageStage } from './usage-stage.js'

export * from './usage.types.js'
export * from './usage.repository.js'
export * from './usage.service.js'
export * from './analytics.service.js'
export * from './usage-stage.js'

export const usageService = new UsageService({ repo: usageRepository })

export const analyticsService = new AnalyticsService({
  usage: usageRepository,
  rooms: roomRepository,
  members: roomMemberRepository
})

export const usageStage = new UsageStage({ usage: usageService })
