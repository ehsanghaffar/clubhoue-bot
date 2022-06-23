/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import agent from '../helper/agent'

const makeChannelPublic = async (profile, channel) => {
  'use strict'

  const response = await agent(
    '/make_channel_public',
    {
      body: {
        channel, // NOTE: channel-uid;
        channel_id: null
      }
    },
    profile
  )
  const data = await response.json()

  return data
}

export default makeChannelPublic

export const specification = {
  success: Boolean
}
