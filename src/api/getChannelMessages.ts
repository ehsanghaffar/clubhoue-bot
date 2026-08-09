/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */

import agent from '../helper/agent.js'
import type { Profile } from '../types/config.js'

interface GetChannelMessagesOptions {
  channel?: string
  order?: boolean
}

const getChannelMessages = async (profile: Profile, opts?: GetChannelMessagesOptions): Promise<unknown> => {
  'use strict'

  const options: GetChannelMessagesOptions = opts ?? {}

  const response = await agent(
    '/get_channel_messages',
    {
      query: {
        channel: options.channel,
        is_chronological_order: Number(options.order)
      }
    },
    {
      ...profile,
      userId: '(null)'
    }
  )
  const data = await response.json()
  return data
}

export default getChannelMessages
