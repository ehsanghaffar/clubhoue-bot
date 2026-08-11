/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type { AutomationActionResult, AutomationRule, RuleContext } from '../automation.types.js'
import type { CommunityEvent, UserJoinedPayload } from '../../events/event.types.js'
import { resolveRoomSettings } from '../../rooms/room.types.js'

const WELCOME_RULE_ID = 'welcome'
const WELCOME_RULE_NAME = 'Welcome message'

export const DEFAULT_WELCOME_MESSAGE = 'Welcome {username}! 👋'

/**
 * Sends a welcome message when a user joins the room, honoring the bot's
 * welcome message template (`{username}` is substituted) and the room's
 * `welcomeEnabled` setting.
 */
export const createWelcomeRule = (): AutomationRule => ({
  id: WELCOME_RULE_ID,
  name: WELCOME_RULE_NAME,
  match: (event: CommunityEvent): boolean => event.type === 'user.joined',
  run: async (event: CommunityEvent, context: RuleContext): Promise<AutomationActionResult> => {
    const settings = resolveRoomSettings(context.room.settings)
    if (!settings.welcomeEnabled) {
      return { ruleId: WELCOME_RULE_ID, ruleName: WELCOME_RULE_NAME, action: 'none', success: false }
    }

    const payload = event.payload as UserJoinedPayload
    const username = payload.username ?? payload.displayName ?? 'friend'
    const template = context.bot.welcomeMessage ?? DEFAULT_WELCOME_MESSAGE
    const message = template.replaceAll('{username}', username)

    await context.sendMessage(message)
    return {
      ruleId: WELCOME_RULE_ID,
      ruleName: WELCOME_RULE_NAME,
      action: 'send_message',
      success: true
    }
  }
})
