/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import debug from 'debug'

const name = 'app-logger'

const createLogger = (domain?: string): debug.Debugger => {
  if (domain) {
    return debug(`${name}:${domain}`)
  }
  return debug(name)
}

export default createLogger
