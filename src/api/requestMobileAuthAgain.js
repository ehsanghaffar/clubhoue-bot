/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import agent from '../structures/agent'

const requestMobileAuthAgain = async (profile, phoneNumber) => {
  'use strict'

  const response = await agent('/resend_phone_number_auth', {
    body: {
      phone_number: phoneNumber // NOTE: +(Nation)(Numbers) e.g. Korean 010 1234 5678 -> +821012345678
    }
  }, profile)
  const data = await response.json()

  return data
}

export default requestMobileAuthAgain

export const specification = {
  success: Boolean,
  error_message: String
}
