/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import agent from '../helper/agent'
import type { Profile } from '../types/config'

interface Contact {
  phone_number: string
}

const getSuggestedInvites = async (profile: Profile, contacts?: Contact[]): Promise<unknown> => {
  'use strict'

  const response = await agent(
    '/get_suggested_invites',
    {
      body: {
        club_id: null,
        upload_contacts: true,
        contacts
      }
    },
    profile
  )
  const data = await response.json()

  return data
}

export default getSuggestedInvites
