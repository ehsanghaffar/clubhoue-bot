/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */

import agent from '../helper/agent.js'
import type { Profile } from '../types/config.js'

interface GetFollowersOptions {
  userId?: number
  size?: number
  page?: number
}

const getFollowers = async (profile: Profile, opts?: number | GetFollowersOptions): Promise<unknown> => {
  'use strict'

  let options: GetFollowersOptions

  if (typeof opts === 'number') {
    options = { userId: opts }
  } else {
    options = opts ?? {}
  }

  const response = await agent(
    '/get_followers',
    {
      query: {
        user_id: options.userId ?? -1,
        page_size: options.size ?? 50,
        page: options.page ?? 1
      }
    },
    {
      ...profile,
      userId: '(null)'
    }
  )
  const data = await response.json()

  return data
}

export default getFollowers
