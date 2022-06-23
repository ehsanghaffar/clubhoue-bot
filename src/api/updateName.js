/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import agent from '../structures/agent'

const updateName = async (profile, name) => {
  'use strict'

  const response = await agent(
    '/update_name',
    {
      body: {
        name: name || null // NOTE: String in `${firstName} ${lastName}` format.
      }
    },
    profile
  )
  const data = await response.json()

  return data
}

export default updateName

export const specification = {
  error_message: String,
  success: Boolean
}
