/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import agent from '../helper/agent'
import type { Profile } from '../types/config'

interface GetEventsOptions {
  size?: number
  page?: number
  is_filtered?: boolean
  isFiltered?: boolean
}

const getEvents = async (profile: Profile, opts?: GetEventsOptions): Promise<unknown> => {
  'use strict'

  const options = opts ?? {}

  const query: Record<string, unknown> = {
    page_size: options.size ?? 25,
    page: options.page ?? 1
  }

  if (options.is_filtered) {
    query.is_filtered = options.isFiltered ?? true
  }

  const response = await agent(
    '/get_events',
    {
      query
    },
    profile
  )
  const data = await response.json()

  return data
}

export default getEvents
