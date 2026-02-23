/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */

import agent from '../helper/agent'
import type { Profile } from '../types/config'

const checkWaitlistStatus = async (profile: Profile, _name?: string): Promise<unknown> => {
  'use strict'

  const response = await agent(
    '/check_waitlist_status',
    {},
    {
      ...profile,
      userId: '(null)'
    }
  )
  const data = await response.json()

  return data
}

export default checkWaitlistStatus
