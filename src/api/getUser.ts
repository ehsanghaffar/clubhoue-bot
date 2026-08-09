/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */

import type { Profile } from '../types/config.js'
import type { ApiEndpointOptions } from '../utils/api-factory.js'
import { createApiEndpoint } from '../utils/api-factory.js'

const baseGetUser = createApiEndpoint({
  url: '/get_profile',
  method: 'POST'
})

// Wrapper to support both options object and direct ID parameter (backward compatibility)
const getUser = async (
  profile: Profile,
  idOrOptions?: string | number | ApiEndpointOptions
): Promise<unknown> => {
  let options: ApiEndpointOptions = { body: {} }

  if (typeof idOrOptions === 'string' || typeof idOrOptions === 'number') {
    options = { body: { user_id: idOrOptions } }
  } else if (idOrOptions != null) {
    options = idOrOptions
  }

  return await baseGetUser(profile, options)
}

export default getUser
