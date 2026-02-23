/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */

import agent from '../helper/agent'
import type { Profile } from '../types/config'

interface LeaveChannelOptions {
  channel: string
}

const leaveChannel = async (profile: Profile, opts?: LeaveChannelOptions): Promise<unknown> => {
  'use strict'

  const options = opts ?? {} as LeaveChannelOptions
  const response = await agent(
    '/leave_channel',
    {
      body: {
        channel: options.channel
      }
    },
    profile
  )
  const data = await response.json()

  return data
}

export default leaveChannel
