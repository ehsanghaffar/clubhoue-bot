/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */

import type { Profile } from '../types/config'
import { createApiEndpoint } from '../utils/api-factory'

interface JoinChannelOptions {
  channel?: string
  source?: string
  isExplore?: boolean
  rank?: number
}

const baseJoinChannel = createApiEndpoint({
  url: '/join_channel',
  method: 'POST'
})

const joinChannel = async (
  profile: Profile,
  opts?: JoinChannelOptions
): Promise<unknown> => {
  const options: JoinChannelOptions = opts ?? {}
  options.source = options.source ?? 'feed'

  const attributions = {
    is_explore: options.isExplore,
    rank: options.rank
  }
  const body: Record<string, unknown> = { channel: options.channel }

  if (options.source === 'feed') {
    body.attribution_details = Buffer.from(JSON.stringify(attributions)).toString('base64')
    body.attribution_source = options.source ?? 'feed'
  }

  return await baseJoinChannel(profile, { body })
}

export default joinChannel
