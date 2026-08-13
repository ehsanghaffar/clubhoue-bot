/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { blockStage, continueStage, type EventStageHandler, type EventStageResult } from '../events/event-processor.js'
import type { CommunityEvent, MessageCreatedPayload } from '../events/event.types.js'
import type { BotRoom } from '../rooms/room.types.js'
import { resolveRoomSettings } from '../rooms/room.types.js'
import type { ModerationDecision, MessageRateLimiter } from './moderation.types.js'
import { InMemoryMessageRateLimiter } from './message-rate-limit.js'
import logger from '../../utils/logger.js'

export interface ModerationStageDeps {
  /** Resolves the room for an event so its moderation config can be read. */
  getRoom: (event: CommunityEvent) => Promise<BotRoom | null>
  /**
   * Message rate limiter, scoped by `botId:roomId:userId`. Falls back to an
   * in-memory limiter; inject a fresh instance in tests.
   */
  limiter?: MessageRateLimiter
}

/**
 * Event pipeline stage that gates `message.created` events before they reach
 * automation/AI (spec §23 / Phase M). A blocked message returns `'block'` from
 * the stage, which stops the pipeline — it never reaches the AI rules and never
 * produces a usage event.
 *
 * Policy comes from the room's settings:
 *  - `moderationEnabled` gates the whole stage (default off, matching MVP);
 *  - `blockedUsers` ignore messages from those external user ids;
 *  - `blockedKeywords` block messages containing any keyword (case-insensitive);
 *  - `messageRateLimit` caps how often one user can trigger automation per
 *    bot+room before it is gated.
 */
export class ModerationStage implements EventStageHandler {
  readonly name = 'moderation'
  private readonly limiter: MessageRateLimiter

  constructor (private readonly deps: ModerationStageDeps) {
    this.limiter = deps.limiter ?? new InMemoryMessageRateLimiter()
  }

  async handle (event: CommunityEvent): Promise<EventStageResult> {
    if (event.type !== 'message.created') {
      return continueStage()
    }

    let room: BotRoom | null
    try {
      room = await this.deps.getRoom(event)
    } catch (error) {
      logger.error('Failed to resolve moderation room', { type: event.type, botId: event.botId, error })
      return continueStage()
    }
    if (room == null) {
      return continueStage()
    }

    const settings = resolveRoomSettings(room.settings)
    if (!settings.moderationEnabled) {
      return continueStage()
    }

    const payload = event.payload as MessageCreatedPayload
    const decision = this.decide(event, payload, settings)

    if (decision.allowed) {
      return continueStage()
    }

    logger.info('Message blocked by moderation', {
      botId: event.botId,
      roomId: event.roomId,
      userId: payload.userId,
      reason: decision.reason
    })
    return blockStage()
  }

  private decide (
    event: CommunityEvent,
    payload: MessageCreatedPayload,
    settings: ReturnType<typeof resolveRoomSettings>
  ): ModerationDecision {
    // Blocked users: external platform user ids configured on the room.
    const blockedUsers = settings.blockedUsers ?? []
    if (payload.userId !== '' && blockedUsers.includes(payload.userId)) {
      return { allowed: false, reason: 'blocked_user' }
    }

    // Blocked keywords: case-insensitive substring match on the raw content.
    const content = payload.content ?? ''
    const lowerContent = content.toLowerCase()
    const blockedKeywords = settings.blockedKeywords ?? []
    for (const keyword of blockedKeywords) {
      if (keyword !== '' && lowerContent.includes(keyword.toLowerCase())) {
        return { allowed: false, reason: 'blocked_keyword' }
      }
    }

    // Message rate limit: scoped per bot + room + user (never global).
    const rateLimit = settings.messageRateLimit
    if (rateLimit != null) {
      const key = `${event.botId}:${event.roomId}:${payload.userId}`
      if (!this.limiter.isAllowed(key, rateLimit.max, rateLimit.windowSeconds)) {
        return { allowed: false, reason: 'rate_limited' }
      }
    }

    return { allowed: true }
  }
}
