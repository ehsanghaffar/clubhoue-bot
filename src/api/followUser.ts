/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */

import agent from '../helper/agent.js'
import type { Profile } from '../types/config.js'

interface FollowUserOptions {
  userId?: number
}

const followUser = async (profile: Profile, opts?: number | FollowUserOptions): Promise<unknown> => {
  'use strict'

  let options: FollowUserOptions

  if (typeof opts === 'number') {
    options = { userId: opts }
  } else {
    options = opts ?? {}
  }

  const response = await agent(
    '/follow',
    {
      body: {
        source: 9,
        source_topic_id: null,
        user_id: options.userId ?? -1,
        user_ids: null
      }
    },
    profile
  )
  const data = await response.json()

  return data
}

export default followUser
