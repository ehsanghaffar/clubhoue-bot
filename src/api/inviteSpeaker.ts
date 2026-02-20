/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import agent from '../helper/agent'
import type { Profile } from '../types/config'

interface InviteSpeakerOptions {
  channel?: string | number
  user?: number
}

const inviteToSpeakers = async (profile: Profile, opts?: InviteSpeakerOptions): Promise<unknown> => {
  'use strict'

  const options = opts ?? {}

  const response = await agent(
    '/invite_speaker',
    {
      body: {
        channel: options.channel ?? -1,
        user_id: options.user ?? -1
      }
    },
    profile
  )
  const data = await response.json()

  return data
}

export default inviteToSpeakers
