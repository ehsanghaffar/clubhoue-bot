/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */

import agent from '../helper/agent'
import type { Profile } from '../types/config'

const audienceReply = async (profile: Profile, channel: string, raiseHands?: boolean, unraiseHands?: boolean): Promise<unknown> => {
  'use strict'

  const response = await agent(
    '/audience_reply',
    {
      body: {
        channel,
        raise_hands: raiseHands ?? true,
        unraise_hands: unraiseHands ?? false
      }
    },
    profile
  )
  const data = await response.json()

  return data
}

export default audienceReply
