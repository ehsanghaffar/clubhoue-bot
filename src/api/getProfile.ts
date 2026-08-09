/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */

import agent from '../helper/agent.js'
import type { Profile } from '../types/config.js'

interface GetProfileOptions {
  includeBlocked?: boolean
  timezone?: string
  includeFollowings?: boolean
}

const getProfile = async (profile: Profile, _opts?: GetProfileOptions): Promise<unknown> => {
  'use strict'

  const response = await agent(
    '/me',
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

export default getProfile
