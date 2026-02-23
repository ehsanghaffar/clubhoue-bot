/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */

import agent from '../helper/agent'
import type { Profile } from '../types/config'

interface GetClubOptions {
  clubId?: number
  sourceTopicId?: number | null
}

const getClub = async (profile: Profile, opts?: number | GetClubOptions): Promise<unknown> => {
  'use strict'

  let options: GetClubOptions

  if (typeof opts === 'number') {
    options = { clubId: opts }
  } else {
    options = opts ?? {}
  }

  const response = await agent(
    '/get_club',
    {
      body: {
        club_id: options.clubId ?? -1,
        source_topic_id: options.sourceTopicId ?? null
      }
    },
    profile
  )
  const data = await response.json()

  return data
}

export default getClub
