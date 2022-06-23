/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import agent from '../structures/agent'

const inviteToApp = async (profile, contactName, phoneNumber) => {
  'use strict'

  const response = await agent('/invite_to_app', {
    body: {
      name: contactName || 'User',
      phone_number: phoneNumber // +821012345678
    }
  }, profile)
  const data = await response.json()

  return data
}

export default inviteToApp

export const specification = {
  success: Boolean
}
