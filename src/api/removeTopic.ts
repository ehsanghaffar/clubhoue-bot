/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */

import agent from '../helper/agent.js'
import type { Profile } from '../types/config.js'

interface RemoveTopicOptions {
  topicId?: number
}

const removeTopic = async (profile: Profile, opts?: number | RemoveTopicOptions): Promise<unknown> => {
  'use strict'

  let options: RemoveTopicOptions

  if (typeof opts === 'number') {
    options = { topicId: opts }
  } else {
    options = opts ?? {}
  }

  const response = await agent(
    '/remove_user_topic',
    {
      body: {
        club_id: null,
        topic_id: options.topicId ?? -1
      }
    },
    profile
  )
  const data = await response.json()

  return data
}

export default removeTopic
