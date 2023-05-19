/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import agent from '../helper/agent'

const sendChannelMessage = async (profile, opts) => {
  'use strict'

  opts = opts || {}

  const res = await agent(
    '/send_channel_message',
    {
      body: {
        channel: opts.channel,
        message: opts.message
      }
    },
    profile
  )
  const data = await res.json()
  return data
}

export default sendChannelMessage

export const specification = {
  success: Boolean
}
