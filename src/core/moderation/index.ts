/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */

/**
 * Moderation: a real event-pipeline gate (spec §23 / Phase M) that runs before
 * automation and AI. Blocked messages never reach the AI rules and never
 * produce usage events.
 */
export * from './moderation.types.js'
export * from './message-rate-limit.js'
export * from './moderation-stage.js'
