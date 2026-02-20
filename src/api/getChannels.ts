/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import agent from '../helper/agent'
import type { Profile } from '../types/config'

interface GetChannelsOptions {
  [key: string]: unknown
}

const getChannels = async (profile: Profile, opts?: GetChannelsOptions): Promise<unknown> => {
  'use strict'

  const _options = opts ?? {}
  const response = await agent(
    '/get_feed_v3?get_unconnected_rooms=true',
    {
      body: {}
    },
    {
      ...profile,
      userId: '(null)'
    }
  )
  const data = await response.json()

  return data
}

export default getChannels
