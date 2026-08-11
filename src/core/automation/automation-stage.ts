/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type { EventStageHandler } from '../events/event-processor.js'
import type { CommunityEvent } from '../events/event.types.js'
import type { RuleContext } from './automation.types.js'
import type { AutomationEngine } from './rule-engine.js'
import logger from '../../utils/logger.js'

const AUTOMATION_EVENT_TYPES = new Set(['user.joined', 'message.created', 'speaker.requested'])

export interface AutomationStageDeps {
  engine: AutomationEngine
  /** Resolves the rule context (bot + room + adapter) for a published event. */
  resolveContext: (event: CommunityEvent) => Promise<RuleContext | null>
}

/**
 * Event pipeline stage that evaluates automation rules. The bot manager owns
 * the live bots/adapters and provides context resolution, so this stage never
 * decrypts credentials or touches platform internals itself.
 */
export class AutomationStage implements EventStageHandler {
  readonly name = 'automation'

  constructor (private readonly deps: AutomationStageDeps) {}

  async handle (event: CommunityEvent): Promise<void> {
    if (!AUTOMATION_EVENT_TYPES.has(event.type)) {
      return
    }
    let context: RuleContext | null
    try {
      context = await this.deps.resolveContext(event)
    } catch (error) {
      logger.error('Failed to resolve automation context', { type: event.type, error })
      return
    }
    if (context == null) {
      return
    }
    await this.deps.engine.evaluate(event, context)
  }
}
