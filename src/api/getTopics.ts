/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import agent from '../helper/agent'
import type { Profile } from '../types/config'

const getTopics = async (profile: Profile): Promise<unknown> => {
  'use strict'

  const response = await agent(
    '/get_all_topics',
    {},
    profile
  )
  const data = await response.json()

  return data
}

export default getTopics
