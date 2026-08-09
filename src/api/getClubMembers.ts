/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */

import agent from '../helper/agent.js'
import type { Profile } from '../types/config.js'

interface GetClubMembersOptions {
  clubId?: number
  returnFollowers?: boolean
  returnMembers?: boolean
  size?: number
  page?: number
}

const getClubMembers = async (profile: Profile, opts?: GetClubMembersOptions): Promise<unknown> => {
  'use strict'

  const options = opts ?? {}

  const response = await agent(
    '/get_club_members',
    {
      query: {
        club_id: options.clubId ?? -1,
        return_followers: Number(!!options.returnFollowers) ?? 0,
        return_members: Number(!!options.returnMembers) ?? 1,
        page_size: options.size ?? 50,
        page: options.page ?? 1
      }
    },
    profile
  )
  const data = await response.json()

  return data
}

export default getClubMembers
