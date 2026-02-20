/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import agent from '../helper/agent'
import type { Profile } from '../types/config'

const getClubs = async (profile: Profile, startableOnly?: boolean): Promise<unknown> => {
  'use strict'

  const response = await agent(
    '/get_clubs',
    {
      body: {
        is_startable_only: !!startableOnly
      }
    },
    profile
  )
  const data = await response.json()

  return data
}

export default getClubs
