/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import agent from '../helper/agent'

const checkForUpdate = async (profile, isTestFlight) => {
  'use strict'

  const response = await agent(
    '/check_for_update',
    {
      query: {
        is_testflight: Number(!!isTestFlight)
      }
    },
    {
      ...profile,
      userId: '(null)',
      token: undefined
    }
  )
  const data = await response.json()

  return data
}

export default checkForUpdate

export const specification = {
  has_update: Boolean,
  success: Boolean
}
