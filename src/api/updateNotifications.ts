/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import agent from '../helper/agent'
import type { Profile } from '../types/config'

interface UpdateNotificationsOptions {
  enableTrendings?: boolean
  frequency?: number
  pauseTill?: 'forAnHour' | 'UntilThisEvening' | 'UntilMorning' | 'ForAWeek' | false
}

const updateNotifications = async (profile: Profile, opts?: UpdateNotificationsOptions): Promise<unknown> => {
  'use strict'

  const options = opts ?? {}

  const response = await agent(
    '/update_notifications',
    {
      body: {
        apn_token: null,
        enable_trending: [1, 2][Number(!!options.enableTrendings)],
        frequency: (options.frequency ?? 0) - 3,
        is_sandbox: false,
        pause_till: [5, 1, 2, 3, 4][
          [
            false,
            'forAnHour',
            'UntilThisEvening',
            'UntilMorning',
            'ForAWeek'
          ].indexOf(options.pauseTill ?? false)
        ],
        system_enabled: -1
      }
    },
    profile
  )
  const data = await response.json()

  return data
}

export default updateNotifications
