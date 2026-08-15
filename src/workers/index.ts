/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */

/**
 * Background workers: queue abstraction, job definitions, handlers, and the
 * worker runner. The MVP embeds the worker in the API process (single
 * process); `src/worker.ts` provides a standalone entry for production.
 */
import { jobQueue } from '../infrastructure/queue/index.js'
import { botManager } from '../core/bots/index.js'
import { aiService } from '../core/ai/index.js'
import { createHandlers } from './handlers.js'
import { Worker } from './worker.js'

export * from './jobs.js'
export * from './handlers.js'
export * from './worker.js'
export * from './scheduler.js'

export const worker = new Worker(jobQueue, createHandlers({
  botManager,
  ai: aiService
}))
