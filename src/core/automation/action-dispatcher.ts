/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type { RuleContext } from './automation.types.js'
import type { Bot } from '../bots/bot.types.js'
import type { BotRoom } from '../rooms/room.types.js'
import type { CommunityPlatformAdapter } from '../../platforms/adapter.js'

export interface BuildRuleContextInput {
  bot: Bot
  room: BotRoom
  adapter: CommunityPlatformAdapter
}

/**
 * Binds a platform adapter (and the bot/room it belongs to) into a
 * `RuleContext`, giving automation rules safe, platform-agnostic ways to act
 * inside a specific room without touching the adapter directly.
 */
export const createRuleContext = (input: BuildRuleContextInput): RuleContext => {
  const { bot, room, adapter } = input

  return {
    bot,
    room,
    adapter,
    sendMessage: async (content: string): Promise<void> => {
      await adapter.sendMessage(room.externalRoomId, content)
    },
    inviteSpeaker: async (userId: string): Promise<void> => {
      await adapter.inviteSpeaker(room.externalRoomId, userId)
    }
  }
}
