/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import agent from '../helper/agent'
import type { Profile } from '../types/config'

interface GetNotificationsOptions {
  userId?: number
  size?: number
  page?: number
}

const getNotifications = async (profile: Profile, opts?: number | GetNotificationsOptions): Promise<unknown> => {
  'use strict'

  let options: GetNotificationsOptions

  if (typeof opts === 'number') {
    options = { userId: opts }
  } else {
    options = opts ?? {}
  }

  const response = await agent(
    '/follow',
    {
      query: {
        page_size: options.size ?? 20,
        page: options.page ?? 1
      }
    },
    profile
  )
  const data = await response.json()

  return data
}

export default getNotifications
