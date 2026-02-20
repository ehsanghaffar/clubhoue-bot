/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import agent from '../helper/agent'
import type { Profile } from '../types/config'

interface GetUsersOfTopicOptions {
  topicId?: number
  size?: number
  page?: number
}

const getUsersOfTopic = async (profile: Profile, opts?: GetUsersOfTopicOptions): Promise<unknown> => {
  'use strict'

  const options = opts ?? {}

  const response = await agent(
    '/get_users_for_topic',
    {
      query: {
        topic_id: options.topicId ?? 1,
        page_size: options.size ?? 25,
        page: options.page ?? 1
      }
    },
    profile
  )
  const data = await response.json()

  return data
}

export default getUsersOfTopic
