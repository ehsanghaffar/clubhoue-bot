/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type { CommunityEvent } from '../events/event.types.js'
import type { Bot } from '../bots/bot.types.js'
import type { BotRoom } from '../rooms/room.types.js'
import type { CommunityPlatformAdapter } from '../../platforms/adapter.js'

/**
 * Outbound actions available to a rule, bound to a specific platform adapter
 * and room so rules stay platform-agnostic.
 */
export interface RuleContext {
  bot: Bot
  room: BotRoom
  adapter: CommunityPlatformAdapter
  /** The bot's own external user id on the platform (for self-message detection). */
  botUserId?: string
  /** The bot's Clubhouse username from the active credential. */
  externalAccountName?: string
  sendMessage: (content: string) => Promise<void>
  inviteSpeaker: (userId: string) => Promise<void>
}

export type AutomationActionType =
  | 'none'
  | 'send_message'
  | 'invite_speaker'
  | 'ai_response'

export interface AutomationActionResult {
  ruleId: string
  ruleName: string
  action: AutomationActionType
  success: boolean
  detail?: string
}

/** A declarative automation rule: match an event, then run an action. */
export interface AutomationRule {
  id: string
  name: string
  match: (event: CommunityEvent) => boolean
  run: (event: CommunityEvent, context: RuleContext) => Promise<AutomationActionResult>
}
