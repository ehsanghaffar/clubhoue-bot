/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */

import { v4 as uuidv4 } from 'uuid'

import agent from '../helper/agent.js'
import type { Profile } from '../types/config.js'

interface RecordActionTrailsOptions {
  type?: string
  date?: string
  eventId?: string
}

const recordActionTrails = async (profile: Profile, opts?: RecordActionTrailsOptions): Promise<unknown> => {
  'use strict'

  const options = opts ?? {}

  const type = options.type ?? 'app_opened'
  const date = options.date ?? Math.floor(Date.now() / 1000) + '.' + Math.random().toString(10).slice(-6)
  const eventId = (options.eventId ?? uuidv4()).toUpperCase()

  const response = await agent(
    '/record_action_trails',
    {
      body: {
        action_trails: [
          {
            blob_data: {
              client_event_id: eventId,
              client_time_recorded: date
            },
            client_event_id: eventId,
            client_time_created: date,
            trail_type: type
          }
        ]
      }
    },
    profile
  )
  const data = await response.json()

  return data
}

export default recordActionTrails
