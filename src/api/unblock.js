/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import agent from '../helper/agent'

const unblock = async (profile, user) => {
  'use strict'

  const response = await agent(
    '/unblock',
    {
      body: {
        user_id: user || -1
      }
    },
    profile
  )
  const data = await response.json()

  return data
}

export default unblock

export const specification = {
  success: Boolean
}
