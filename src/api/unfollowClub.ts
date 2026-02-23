/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */

import agent from '../helper/agent'
import type { Profile } from '../types/config'

interface UnfollowClubOptions {
  clubId?: number
  sourceTopicId?: number | null
}

const unfollowClub = async (profile: Profile, opts?: number | UnfollowClubOptions): Promise<unknown> => {
  'use strict'

  let options: UnfollowClubOptions

  if (typeof opts === 'number') {
    options = { clubId: opts }
  } else {
    options = opts ?? {}
  }

  const response = await agent(
    '/unfollow_club',
    {
      body: {
        club_id: options.clubId ?? 1,
        source_topic_id: options.sourceTopicId ?? null
      }
    },
    profile
  )
  const data = await response.json()

  return data
}

export default unfollowClub
