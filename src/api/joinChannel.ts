/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import agent from '../helper/agent'
import type { Profile } from '../types/config'

interface JoinChannelOptions {
  channel?: string
  source?: string
  isExplore?: boolean
  rank?: number
}

const joinChannel = async (profile: Profile, opts?: JoinChannelOptions): Promise<unknown> => {
  'use strict'

  const options: JoinChannelOptions = opts ?? {}
  options.source = options.source ?? 'feed'

  const attributions = {
    is_explore: options.isExplore,
    rank: options.rank
  }
  const body: { channel?: string; attribution_details?: string; attribution_source?: string } = {}

  if (options.source === 'feed') {
    body.attribution_details = Buffer.from(JSON.stringify(attributions)).toString('base64')
    body.attribution_source = options.source ?? 'feed'
  }

  body.channel = options.channel

  const response = await agent(
    '/join_channel',
    {
      body
    },
    profile
  )
  const data = await response.json()

  return data
}

export default joinChannel
