/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */

import agent from '../helper/agent.js'
import type { Profile } from '../types/config.js'

const completeMobileAuth = async (profile: Profile, phoneNumber: string, code: string): Promise<unknown> => {
  'use strict'

  const response = await agent('/complete_phone_number_auth', {
    body: {
      verification_code: code,
      phone_number: phoneNumber
    }
  }, profile)
  const data = await response.json()

  return data
}

export default completeMobileAuth
