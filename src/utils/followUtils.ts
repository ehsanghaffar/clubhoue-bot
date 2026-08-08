/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import agent from '../helper/agent'
import type { Profile } from '../types/config'

interface FollowUserOptions {
  userId?: number
}

interface FollowClubOptions {
  clubId?: number
}

type FollowOptions = FollowUserOptions | FollowClubOptions | number

type FollowAction = 'follow' | 'unfollow'
type FollowType = 'user' | 'club'

const followOperation = async (
  action: FollowAction,
  type: FollowType,
  profile: Profile,
  opts?: FollowOptions
): Promise<unknown> => {
  'use strict'

  let options: FollowUserOptions | FollowClubOptions

  if (typeof opts === 'number') {
    options =
      type === 'user' ? { userId: opts } : { clubId: opts }
  } else {
    options = (opts ?? {})
  }

  const endpoint = `/${action}`
  const body: Record<string, unknown> = {
    source: 9,
    source_topic_id: null
  }

  if (type === 'user') {
    body.user_id = (options as FollowUserOptions).userId ?? -1
    body.user_ids = null
  } else if (type === 'club') {
    body.club_id = (options as FollowClubOptions).clubId ?? -1
  }

  const response = await agent(endpoint, { body }, profile)
  const data = await response.json()

  return data
}

export const followUser = async (
  profile: Profile,
  opts?: FollowOptions
): Promise<unknown> => {
  return await followOperation('follow', 'user', profile, opts)
}

export const unfollowUser = async (
  profile: Profile,
  userId: number
): Promise<unknown> => {
  return await followOperation('unfollow', 'user', profile, userId)
}

export const followClub = async (
  profile: Profile,
  opts?: FollowOptions
): Promise<unknown> => {
  return await followOperation('follow', 'club', profile, opts)
}

export const unfollowClub = async (
  profile: Profile,
  opts?: FollowOptions
): Promise<unknown> => {
  return await followOperation('unfollow', 'club', profile, opts)
}

export { followOperation }
