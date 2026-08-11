/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type { AutomationActionResult, AutomationRule, RuleContext } from '../automation.types.js'
import type { CommunityEvent } from '../../events/event.types.js'
import { resolveRoomSettings } from '../../rooms/room.types.js'
import { resolveAiConfig } from '../../bots/bot.types.js'

const AI_RULE_ID = 'ai-answer'
const AI_RULE_NAME = 'AI Q&A'

/**
 * Produces a response for a message if one should be given. Returns `null`
 * when no response is warranted (not triggered, cooldown active, etc.). The
 * concrete implementation is provided by the AI service (Phase H) so the
 * automation engine stays decoupled from any specific provider.
 */
export type AiRunner = (
  event: CommunityEvent,
  context: RuleContext
) => Promise<string | null>

export interface AiRuleDeps {
  runner: AiRunner
}

/**
 * Answers user questions with the AI when the room's `aiEnabled` and the
 * bot's `aiConfig.enabled` are both true. The response is sent via
 * `context.sendMessage` so rules stay platform-agnostic.
 */
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

    const answer = await deps.runner(event, context)
    if (answer == null) {
      return { ruleId: AI_RULE_ID, ruleName: AI_RULE_NAME, action: 'none', success: false }
    }

    await context.sendMessage(answer)
    return {
      ruleId: AI_RULE_ID,
      ruleName: AI_RULE_NAME,
      action: 'ai_response',
      success: true
    }
  }
})
