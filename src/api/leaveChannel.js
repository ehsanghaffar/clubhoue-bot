/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import agent from '../helper/agent'

const leaveChannel = async (profile, opts) => {
  'use strict'

  opts = opts || {}
  const response = await agent(
    '/leave_channel',
    {
      body: {
        channel: opts.channel
      }
    },
    profile
  )
  const data = await response.json()

  return data
}

export default leaveChannel

export const specification = {
  success: Boolean
}
