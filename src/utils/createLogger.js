/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import debug from 'debug'

const name = 'app-logger'

export default domain => {
  if (domain) {
    return debug(name + ':' + domain)
  }

  return debug(name)
}
