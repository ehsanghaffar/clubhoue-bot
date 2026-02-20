/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import agent from '../helper/agent'
import type { Profile } from '../types/config'

interface GetSuggestedFollowsOptions {
  onBoarding?: boolean
  size?: number
  page?: number
}

const getSuggestedFollows = async (profile: Profile, opts?: GetSuggestedFollowsOptions): Promise<unknown> => {
  'use strict'

  const options = opts ?? {}

  const response = await agent(
    '/get_suggested_follows_all',
    {
      query: {
        in_onboarding: options.onBoarding ?? false,
        page_size: options.size ?? 25,
        page: options.page ?? 1
      }
    },
    profile
  )
  const data = await response.json()

  return data
}

export default getSuggestedFollows
