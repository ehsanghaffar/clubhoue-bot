/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { v4 as uuidv4 } from 'uuid'

import * as api from '../api'
import { createLogger } from '../utils'

export default class Client {
  constructor (opts) {
    opts = opts || {}

    this.debug = createLogger('client')

    this.profile = opts.profile || {}
    this.profile.deviceId = (this.profile.deviceId || uuidv4()).toUpperCase()

    this.debug('initiated new client identified by', this.profile.deviceId)

    const apiNames = Object.keys(api)

    for (let i = 0, l = apiNames.length; i < l; i++) {
      const apiName = apiNames[i]
      const fn = api[apiName]

      this[apiName] = async (...args) => {
        this.debug('calling api function:', apiName)

        return fn(this.profile, ...args)
      }
    }
  }
}
