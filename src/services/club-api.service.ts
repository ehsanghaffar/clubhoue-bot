/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */

/**
 * Backward-compatibility shim. The Clubhouse API wrapper now lives at
 * `src/platforms/clubhouse/api.service.ts`; this re-export keeps the legacy
 * `clubService` singleton and `ClubApiService` class available to the
 * pre-refactor services/controllers.
 */
export { ClubApiService, clubService } from '../platforms/clubhouse/api.service.js'
