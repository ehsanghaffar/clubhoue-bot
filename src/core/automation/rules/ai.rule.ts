/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type { AutomationActionResult, AutomationRule, RuleContext } from '../automation.types.js'
import type { CommunityEvent } from '../../events/event.types.js'
import type { ActionIdempotencyStore } from '../../events/action-idempotency.js'
import { buildActionKey } from '../../events/action-idempotency.js'
import { resolveRoomSettings } from '../../rooms/room.types.js'
import { resolveAiConfig } from '../../bots/bot.types.js'

const AI_RULE_ID = 'ai-answer'
const AI_RULE_NAME = 'AI Q&A'

export type AiRunner = (
  event: CommunityEvent,
  context: RuleContext
) => Promise<string | null>

export interface AiRuleDeps {
  runner: AiRunner
  actions: ActionIdempotencyStore
}

export const createAiRule = (deps: AiRuleDeps): AutomationRule => ({
  id: AI_RULE_ID,
  name: AI_RULE_NAME,
  match: (event: CommunityEvent): boolean => event.type === 'message.created',
  run: async (event: CommunityEvent, context: RuleContext): Promise<AutomationActionResult> => {
    const settings = resolveRoomSettings(context.room.settings)
    const ai = resolveAiConfig(context.bot.aiConfig)
    if (!settings.aiEnabled || !ai.enabled) {
      return { ruleId: AI_RULE_ID, ruleName: AI_RULE_NAME, action: 'none', success: false }
    }

    const key = buildActionKey(event.tenantId, event.id, AI_RULE_ID, 'ai_response')
    const claim = await deps.actions.claim(event.tenantId, key, {
      actionType: 'ai_response',
      ruleId: AI_RULE_ID,
      eventId: event.id,
      botId: event.botId,
      roomId: event.roomId
    })
    if (!claim.acquired) {
      return { ruleId: AI_RULE_ID, ruleName: AI_RULE_NAME, action: 'none', success: true }
    }

    try {
      const answer = await deps.runner(event, context)
      if (answer == null) {
        await deps.actions.release(event.tenantId, key)
        return { ruleId: AI_RULE_ID, ruleName: AI_RULE_NAME, action: 'none', success: false }
      }
      await context.sendMessage(answer)
      await deps.actions.markExecuted(event.tenantId, key)
      return {
        ruleId: AI_RULE_ID,
        ruleName: AI_RULE_NAME,
        action: 'ai_response',
        success: true
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      await deps.actions.markFailed(event.tenantId, key, message)
      throw error
    }
  }
})
