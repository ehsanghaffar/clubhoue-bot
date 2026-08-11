/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import logger from './utils/logger.js'

/**
 * Standalone worker entrypoint — FUTURE INFRASTRUCTURE (spec §18).
 *
 * Intentionally NOT wired in the MVP. The single-process BotManager + room-loop
 * architecture owned by `src/server.ts` is the source of truth: the API process
 * is the ONLY process that boots a live bot runtime.
 *
 * Do NOT boot live bots or start queue processing from this entry — doing so
 * would create a second live bot runtime (duplicate room loops, welcomes,
 * invites, and usage accounting). When the Scheduler → Queue → Worker
 * architecture is implemented, this entry becomes the production runner and the
 * API process stops owning live bots.
 *
 * Future:
 *   Scheduler → Queue (Redis/BullMQ) → Worker
 */
logger.warn(
  'Worker entry is future infrastructure and is NOT active in the MVP. ' +
    'Live bot execution is owned by the API process (src/server.ts).'
)

void (async () => {
  logger.info('Worker (future) exiting — no background work configured for the MVP.')
})()

export {}
