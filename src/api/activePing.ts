/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import agent from '../helper/agent'
import type { Profile } from '../types/config'

interface ActivePingOptions {
  channel?: string
}

const activePing = async (profile: Profile, opts?: ActivePingOptions): Promise<unknown> => {
  'use strict'
  const body: { channel?: string } = {}
  const options: ActivePingOptions = opts ?? {}
  body.channel = options.channel

  const response = await agent(
    '/active_ping',
    {
      body
    },
    profile
  )
  const data = await response.json()

  return data
}

export default activePing
