/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import agent from '../helper/agent'

const getActionableNotifications = async (profile, opts) => { // NOTE: opts = Number | Object;
  'use strict'

  if (typeof opts === 'number') {
    opts = {
      userId: opts
    }
  }

  opts = opts || {}

  const response = await agent(
    '/follow',
    {
      page_size: opts.size || 20,
      page: opts.page || 1
    },
    profile
  )
  const data = await response.json()

  return data
}

export default getActionableNotifications

export const specification = {
  count: Number,
  next: Number,
  notifications: [],
  previous: Number,
  success: Boolean
}
