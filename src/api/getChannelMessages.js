/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import agent from '../helper/agent'

const getChannelMessages = async (profile, opts) => {
  'use strict'

  opts = opts || {}
  
  const response = await agent(
    `/get_channel_messages`,
    {
      query: {
        channel: opts.channel,
        is_chronological_order: Number(opts.order)
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