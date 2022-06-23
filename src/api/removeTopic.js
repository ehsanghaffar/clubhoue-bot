/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import agent from '../structures/agent'

const removeTopic = async (profile, opts) => { // NOTE: opts = Number | Object;
  'use strict'

  if (typeof opts === 'number') {
    opts = {
      topicId: opts
    }
  }

  opts = opts || {}

  const response = await agent(
    '/remove_user_topic',
    {
      body: {
        club_id: null,
        topic_id: opts.topicId || -1
      }
    },
    profile
  )
  const data = await response.json()

  return data
}

export default removeTopic

export const specification = {
  success: Boolean
}
