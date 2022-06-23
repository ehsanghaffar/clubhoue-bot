/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import agent from '../helper/agent'

const unfollowUser = async (profile, userId) => {
  'use strict'

  const response = await agent(
    '/unfollow',
    {
      body: {
        user_id: userId || 1
      }
    },
    profile
  )
  const data = await response.json()

  return data
}

export default unfollowUser

export const specification = {
  success: Boolean
}
