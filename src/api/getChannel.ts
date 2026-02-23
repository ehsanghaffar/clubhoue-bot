/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */

import agent from '../helper/agent'
import type { Profile } from '../types/config'

interface GetChannelOptions {
  channel: string
}

const getChannel = async (profile: Profile, opts?: GetChannelOptions): Promise<unknown> => {
  'use strict'

  const options = opts ?? {} as GetChannelOptions
  const response = await agent(
    '/get_channel',
    {
      body: {
        channel: options.channel
      }
    },
    profile
  )
  const data = await response.json()

  return data
}

export default getChannel
