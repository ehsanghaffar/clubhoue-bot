/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */

/**
 * Clubhouse platform module. Call `registerClubhouseAdapter()` (or
 * `registerBuiltinAdapters()` at boot) so `createPlatformAdapter('clubhouse', …)`
 * can construct adapters.
 */
import { registerAdapterFactory } from '../adapter.js'
import { ClubhouseAdapter } from './adapter.js'

export { ClubApiService } from './api.service.js'
export { ClubhouseApiError } from './errors.js'
export { default as agent } from './agent.js'
export * from './types.js'
export * from './mappers.js'
export { ClubhouseAdapter } from './adapter.js'

export const registerClubhouseAdapter = (): void => {
  registerAdapterFactory('clubhouse', (credential) => new ClubhouseAdapter(credential))
}
