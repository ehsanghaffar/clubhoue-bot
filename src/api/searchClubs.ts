/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */

import agent from '../helper/agent'
import type { Profile } from '../types/config'

interface SearchClubsOptions {
  query?: string
  onlyCoFollows?: boolean
  onlyFollowers?: boolean
  onlyFollowing?: boolean
}

const searchClubs = async (profile: Profile, opts?: SearchClubsOptions): Promise<unknown> => {
  'use strict'

  const options = opts ?? {}

  const response = await agent(
    '/search_clubs',
    {
      body: {
        cofollows_only: options.onlyCoFollows ?? false,
        followers_only: options.onlyFollowers ?? false,
        following_only: options.onlyFollowing ?? false,
        query: options.query ?? ''
      }
    },
    profile
  )
  const data = await response.json()

  return data
}

export default searchClubs
