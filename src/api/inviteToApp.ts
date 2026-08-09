/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */

import agent from '../helper/agent.js'
import type { Profile } from '../types/config.js'

const inviteToApp = async (profile: Profile, contactName?: string, phoneNumber?: string): Promise<unknown> => {
  'use strict'

  const response = await agent('/invite_to_app', {
    body: {
      name: contactName ?? 'User',
      phone_number: phoneNumber
    }
  }, profile)
  const data = await response.json()

  return data
}

export default inviteToApp
