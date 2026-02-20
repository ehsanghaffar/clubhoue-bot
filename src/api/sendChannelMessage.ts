/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import agent from '../helper/agent'
import type { Profile } from '../types/config'

interface SendChannelMessageOptions {
  channel: string
  message: string
}

const sendChannelMessage = async (profile: Profile, opts?: SendChannelMessageOptions): Promise<unknown> => {
  'use strict'

  const options = opts ?? {} as SendChannelMessageOptions

  const res = await agent(
    '/send_channel_message',
    {
      body: {
        channel: options.channel,
        message: options.message
      }
    },
    profile
  )
  const data = await res.json()
  return data
}

export default sendChannelMessage
