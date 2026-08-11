/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */

/** A unit of background work. */
export interface QueueJob<T = unknown> {
  id: string
  name: string
  data: T
  attempts: number
  maxAttempts: number
  createdAt: Date
}

/** Job data is always a plain serializable object. */
export type QueueJobData = Record<string, unknown>

export interface EnqueueOptions {
  /** How many times the worker may retry the job on failure (default 1). */
  maxAttempts?: number
  /** Delay before the job becomes visible to workers (ms). */
  delayMs?: number
}

/**
 * Storage-agnostic background job queue. The MVP ships an in-memory
 * implementation (single process); a Redis-backed queue (e.g. BullMQ) is the
 * documented upgrade path and can replace this without touching workers.
 */
export interface JobQueue {
  enqueue: (name: string, data: QueueJobData, options?: EnqueueOptions) => Promise<string>
  /** Registers the single consumer that receives every enqueued job. */
  process: (handler: (job: QueueJob) => Promise<void>) => void
  start: () => void
  stop: () => void
}
