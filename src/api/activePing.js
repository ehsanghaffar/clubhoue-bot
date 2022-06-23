/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import agent from '../structures/agent'

const activePing = async (profile, opts) => {
  'use strict'
  const body = {}
  opts = opts || {}
  body.channel = opts.channel

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

export const specification = {
  should_leave: Boolean,
  success: Boolean
}
