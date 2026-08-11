/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type { EventStageHandler } from '../events/event-processor.js'
import type { CommunityEvent } from '../events/event.types.js'
import type { UsageType } from './usage.types.js'
import type { UsageService } from './usage.service.js'
import logger from '../../utils/logger.js'

/** Maps normalized community events onto the usage event vocabulary. */
const EVENT_TO_USAGE: Partial<Record<string, UsageType>> = {
  'room.joined': 'room_join',
  'room.left': 'room_leave',
  'message.created': 'message_received',
  'speaker.invited': 'speaker_invite'
}

export interface UsageStageDeps {
  usage: UsageService
}

/**
 * Event pipeline stage that turns community events into usage records.
 * Automation/AI usage (ai_request, ai_response, automation_triggered,
 * message_sent) is recorded closer to the source by those subsystems; this
 * stage covers the platform-observed events.
 */
export class UsageStage implements EventStageHandler {
  readonly name = 'usage'

  constructor (private readonly deps: UsageStageDeps) {}

  async handle (event: CommunityEvent): Promise<void> {
    const type = EVENT_TO_USAGE[event.type]
    if (type == null) {
      return
    }
    try {
      await this.deps.usage.record({
        tenantId: event.tenantId,
        botId: event.botId,
        roomId: event.roomId,
        type
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error('Failed to record usage event', { type, botId: event.botId, error: message })
    }
  }
}
