/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import agent from '../structures/agent'

const followUser = async (profile, opts) => { // NOTE: opts = Number | Object;
  'use strict'

  if (typeof opts === 'number') {
    opts = {
      userId: opts
    }
  }

  opts = opts || {}

  const response = await agent(
    '/follow',
    {
      body: {
        source: 9, // NOTE: unknown; (approx) search;
        source_topic_id: null,
        user_id: opts.userId || -1,
        user_ids: null
      }
    },
    profile
  )
  const data = await response.json()

  return data
}

export default followUser

export const specification = {
  success: Boolean
}
