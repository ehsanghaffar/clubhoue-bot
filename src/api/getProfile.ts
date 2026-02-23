/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */

import agent from '../helper/agent'
import type { Profile } from '../types/config'

interface GetProfileOptions {
  includeBlocked?: boolean
  timezone?: string
  includeFollowings?: boolean
}

const getProfile = async (profile: Profile, opts?: GetProfileOptions): Promise<unknown> => {
  'use strict'

  const _options = opts ?? {}

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
