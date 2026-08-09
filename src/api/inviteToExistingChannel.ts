/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */

import agent from '../helper/agent.js'
import type { Profile } from '../types/config.js'

interface InviteToExistingChannelOptions {
  channel?: string | number
  user?: number | number[]
}

const inviteToExistingChannel = async (profile: Profile, opts?: InviteToExistingChannelOptions): Promise<unknown> => {
  'use strict'

  const options = opts ?? {}

  const response = await agent(
    '/invite_to_existing_channel',
    {
      body: {
        channel: options.channel ?? -1,
        user_ids: options.user ?? -1
      }
    },
    profile
  )
  const data = await response.json()

  return data
}

export default inviteToExistingChannel
