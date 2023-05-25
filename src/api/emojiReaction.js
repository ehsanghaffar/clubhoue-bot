/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import agent from '../helper/agent'

const emojiReaction = async (profile, opts) => {
  'use strict'

  opts = opts || {}
  const response = await agent(
    '/emoji_reaction',
    {
      body: {
        channel: opts.channel,
        emoji: opts.emoji
      }
    },
    profile
  )
  const data = await response.json()

  return data
}

export default emojiReaction
