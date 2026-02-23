/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */

import agent from '../helper/agent'
import type { Profile } from '../types/config'

interface CreateChannelOptions {
  clubId?: number | null
  eventId?: number | null
  isPrivate?: boolean
  isSocialized?: boolean
  topic?: string | null
  guests?: number[]
}

const createChannel = async (profile: Profile, opts?: CreateChannelOptions): Promise<unknown> => {
  'use strict'

  const options = opts ?? {}

  const response = await agent(
    '/create_channel',
    {
      body: {
        clubId: options.clubId ?? null,
        eventId: options.eventId ?? null,
        is_private: options.isPrivate ?? false,
        is_social_mode: options.isSocialized ?? false,
        topic: options.topic ?? null,
        user_ids: options.guests ?? []
      }
    },
    profile
  )
  const data = await response.json()

  return data
}

export default createChannel
