/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import agent from '../helper/agent'

const followClub = async (profile, opts) => { // NOTE: opts = Number | Object;
  'use strict'

  if (typeof opts === 'number') {
    opts = {
      clubId: opts
    }
  }

  opts = opts || {}

  const response = await agent(
    '/follow_club',
    {
      body: {
        club_id: opts.clubId || -1,
        source_topic_id: opts.sourceTopicId || null
      }
    },
    profile
  )
  const data = await response.json()

  return data
}

export default followClub

export const specification = {
  success: Boolean
}
