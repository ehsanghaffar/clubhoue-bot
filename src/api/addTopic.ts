/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */

import agent from '../helper/agent'
import type { Profile } from '../types/config'

interface AddTopicOptions {
  topicId?: number
}

const addTopic = async (profile: Profile, opts?: number | AddTopicOptions): Promise<unknown> => {
  'use strict'

  let options: AddTopicOptions

  if (typeof opts === 'number') {
    options = { topicId: opts }
  } else {
    options = opts ?? {}
  }

  const response = await agent(
    '/add_user_topic',
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

export default addTopic
