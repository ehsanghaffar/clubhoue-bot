/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import agent from '../structures/agent'

const block = async (profile, user) => {
  'use strict'

  const response = await agent(
    '/block',
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

export default block

export const specification = {
  success: Boolean
}
