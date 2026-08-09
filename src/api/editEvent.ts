/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */

import agent from '../helper/agent.js'
import type { Profile } from '../types/config.js'

interface EditEventOptions {
  clubId?: number | null
  description?: string | null
  eventHashId?: string | null
  eventId?: number | null
  memberOnly?: boolean
  startDate?: string | number | Date
  guests?: number[]
}

const editEvent = async (profile: Profile, opts?: EditEventOptions): Promise<unknown> => {
  'use strict'

  const options = opts ?? {}

  const response = await agent(
    '/edit_event',
    {
      body: {
        clubId: options.clubId ?? null,
        description: options.description ?? null,
        event_hashid: options.eventHashId ?? null,
        eventId: options.eventId ?? null,
        is_member_only: options.memberOnly ?? false,
        time_start_epoch: Math.floor(new Date(options.startDate ?? Date.now()).getTime() / 1000),
        user_ids: options.guests ?? []
      }
    },
    profile
  )
  const data = await response.json()

  return data
}

export default editEvent
