/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */

/**
 * Clubhouse platform module. Importing this module registers the Clubhouse
 * adapter factory so `createPlatformAdapter('clubhouse', credential)` works.
 *
 * The legacy `clubService` singleton is re-exported here for backward
 * compatibility with the pre-refactor services/controllers.
 */
import { registerAdapterFactory } from '../adapter.js'
import { ClubhouseAdapter } from './adapter.js'

export { ClubApiService, clubService } from './api.service.js'
export { default as agent } from './agent.js'
export * from './types.js'
export * from './mappers.js'
export { ClubhouseAdapter } from './adapter.js'

registerAdapterFactory('clubhouse', (credential) => new ClubhouseAdapter(credential))
