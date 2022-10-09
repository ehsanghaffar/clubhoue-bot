/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import agent from '../helper/agent'

const leaveChannel = async (profile, channel) => {
  'use strict'

  const response = await agent(
    '/leave_channel',
    {
      body: {
        channel // NOTE: channel-uid;
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
