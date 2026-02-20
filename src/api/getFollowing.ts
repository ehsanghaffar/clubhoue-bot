/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import agent from '../helper/agent'
import type { Profile } from '../types/config'

interface GetFollowingOptions {
  userId?: number
  size?: number
  page?: number
}

const getFollowing = async (profile: Profile, opts?: number | GetFollowingOptions): Promise<unknown> => {
  'use strict'

  let options: GetFollowingOptions

  if (typeof opts === 'number') {
    options = { userId: opts }
  } else {
    options = opts ?? {}
  }

  const response = await agent(
    '/get_following',
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

export default getFollowing
