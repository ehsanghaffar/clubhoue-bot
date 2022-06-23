/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import agent from '../structures/agent'

const getSettings = async profile => {
  'use strict'

  const response = await agent('/get_settings', {}, profile)
  const data = await response.json()

  return data
}

export default getSettings

export const specification = {
  notification_enabled: Boolean,
  notification_frequency: Number, // minus-two to plus-two including zero
  notification_is_paused: Boolean,
  success: Boolean
}
