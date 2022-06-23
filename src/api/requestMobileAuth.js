/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import agent from '../structures/agent'

const requestMobileAuth = async (profile, phoneNumber) => {
  'use strict'

  const response = await agent('/start_phone_number_auth', {
    body: {
      phone_number: phoneNumber // NOTE: +(Nation)(Numbers) e.g. Korean 010 1234 5678 -> +821012345678
    }
  }, profile)
  const data = await response.json()

  return data
}

export default requestMobileAuth

export const specification = {
  success: Boolean,
  is_blocked: Boolean,
  error_message: String
}
