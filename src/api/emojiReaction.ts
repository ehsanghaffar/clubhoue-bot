/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */

import agent from '../helper/agent'
import type { Profile } from '../types/config'

interface EmojiReactionOptions {
  channel: string
  emoji: string
}

const emojiReaction = async (profile: Profile, opts?: EmojiReactionOptions): Promise<unknown> => {
  'use strict'

  const options = opts ?? {} as EmojiReactionOptions
  const response = await agent(
    '/emoji_reaction',
    {
      body: {
        channel: options.channel,
        emoji: options.emoji
      }
    },
    profile
  )
  const data = await response.json()

  return data
}

export default emojiReaction
