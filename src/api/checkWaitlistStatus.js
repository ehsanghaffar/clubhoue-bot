/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import agent from '../structures/agent'

const checkWaitlistStatus = async (profile, name) => {
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

export const specification = {
  is_onborading: Boolean,
  is_waitlisted: Boolean,
  success: Boolean
}
