/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type {
  AutomationActionResult,
  AutomationRule,
  RuleContext
} from './automation.types.js'
import type { CommunityEvent } from '../events/event.types.js'
import logger from '../../utils/logger.js'

export interface AutomationEngineDeps {
  rules?: AutomationRule[]
}

/**
 * Evaluates automation rules against incoming community events. Rules are
 * matched first (pure predicate) and only then run with a full rule context
 * bound to the bot/room/adapter. A rule that throws is logged and skipped —
 * it never aborts evaluation of the remaining rules.
 */
export class AutomationEngine {
  private readonly rules: AutomationRule[]

  constructor (deps: AutomationEngineDeps = {}) {
    this.rules = [...(deps.rules ?? [])]
  }

  addRule (rule: AutomationRule): this {
    this.rules.push(rule)
    return this
  }

  get ruleCount (): number {
    return this.rules.length
  }

  async evaluate (
    event: CommunityEvent,
    context: RuleContext
  ): Promise<AutomationActionResult[]> {
    const results: AutomationActionResult[] = []

    for (const rule of this.rules) {
      let matched = false
      try {
        matched = rule.match(event)
      } catch (error) {
        logger.error('Automation rule match threw', { ruleId: rule.id, error })
        continue
      }
      if (!matched) {
        continue
      }

      try {
        const result = await rule.run(event, context)
        if (result.action !== 'none') {
          results.push(result)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        logger.error('Automation rule run failed', {
          ruleId: rule.id,
          error: message
        })
        results.push({
          ruleId: rule.id,
          ruleName: rule.name,
          action: 'none',
          success: false,
          detail: message
        })
      }
    }

    return results
  }
}
