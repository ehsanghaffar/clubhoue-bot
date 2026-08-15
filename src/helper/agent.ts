/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */

/**
 * Backward-compatibility shim. The Clubhouse HTTP transport now lives at
 * `src/platforms/clubhouse/agent.ts`; this re-export keeps legacy imports
 * working without touching the rest of the codebase.
 */
export { default } from '../platforms/clubhouse/agent.js'
