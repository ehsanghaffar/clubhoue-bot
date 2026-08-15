/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { continueStage, retryStage, type EventStageHandler, type EventStageResult } from '../events/event-processor.js'
import type { CommunityEvent } from '../events/event.types.js'
import type { RuleContext } from './automation.types.js'
import type { AutomationEngine } from './rule-engine.js'
import type { UsageRecorder } from '../usage/usage.types.js'
import logger from '../../utils/logger.js'

const AUTOMATION_EVENT_TYPES = new Set(['user.joined', 'message.created', 'speaker.requested'])

export interface AutomationStageDeps {
  engine: AutomationEngine
  /** Resolves the rule context (bot + room + adapter) for a published event. */
  resolveContext: (event: CommunityEvent) => Promise<RuleContext | null>
  /** Optional usage recorder for automation_triggered telemetry. */
  usage?: UsageRecorder
}

/**
 * Event pipeline stage that evaluates automation rules. The bot manager owns
 * the live bots/adapters and provides context resolution, so this stage never
 * decrypts credentials or touches platform internals itself.
 */
export class AutomationStage implements EventStageHandler {
  readonly name = 'automation'

  constructor (private readonly deps: AutomationStageDeps) {}

  async handle (event: CommunityEvent): Promise<EventStageResult> {
    if (!AUTOMATION_EVENT_TYPES.has(event.type)) {
      return continueStage()
    }
    let context: RuleContext | null
    try {
      context = await this.deps.resolveContext(event)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error('Failed to resolve automation context', { type: event.type, error: message })
      return retryStage(message)
    }
    if (context == null) {
      return continueStage()
    }
    try {
      const results = await this.deps.engine.evaluate(event, context)
      if (results.length > 0 && this.deps.usage != null) {
        await this.deps.usage.record({
          tenantId: event.tenantId,
          botId: event.botId,
          roomId: event.roomId,
          type: 'automation_triggered',
          meta: { ruleIds: results.map((r) => r.ruleId) }
        })
      }
      const failed = results.find((r) => !r.success && r.action !== 'none')
      if (failed != null) {
        return retryStage(`automation action failed: ${failed.ruleId}`)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error('Automation stage failed', { type: event.type, error: message })
      return retryStage(message)
    }
    return continueStage()
  }
}
