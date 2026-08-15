/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */

/**
 * Background queue abstraction. InMemoryQueue is the MVP default (single
 * process). The documented production upgrade path is a Redis-backed queue
 * (BullMQ) implementing the same `JobQueue` interface; workers are written
 * against the interface and do not change.
 */
import { InMemoryQueue } from './in-memory-queue.js'

export * from './queue.js'
export * from './in-memory-queue.js'

export const jobQueue: InMemoryQueue = new InMemoryQueue()
