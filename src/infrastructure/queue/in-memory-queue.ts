/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type {
  EnqueueOptions,
  JobQueue,
  QueueJob,
  QueueJobData
} from './queue.js'
import logger from '../../utils/logger.js'

interface PendingJob {
  job: QueueJob
  availableAt: number
}

/**
 * In-process FIFO queue with optional per-job delay and retry. Jobs are kept
 * in memory, so it is only safe for a single process — the BullMQ/Redis
 * implementation is the production upgrade path (see queue docs).
 */
export class InMemoryQueue implements JobQueue {
  private readonly pending: PendingJob[] = []
  private handler: ((job: QueueJob) => Promise<void>) | null = null
  private readonly timers = new Map<string, NodeJS.Timeout>()
  private running = false
  private draining = false
  private seq = 0

  async enqueue (name: string, data: QueueJobData, options: EnqueueOptions = {}): Promise<string> {
    const id = `job_${++this.seq}`
    const job: QueueJob = {
      id,
      name,
      data,
      attempts: 0,
      maxAttempts: options.maxAttempts ?? 1,
      createdAt: new Date()
    }
    const availableAt = Date.now() + (options.delayMs ?? 0)

    if (availableAt > Date.now()) {
      const timer = setTimeout(() => {
        this.timers.delete(id)
        this.push(job)
      }, options.delayMs ?? 0)
      this.timers.set(id, timer)
    } else {
      this.push(job)
    }
    return id
  }

  process (handler: (job: QueueJob) => Promise<void>): void {
    this.handler = handler
  }

  start (): void {
    if (this.running) {
      return
    }
    this.running = true
    void this.drain()
  }

  stop (): void {
    this.running = false
    for (const timer of this.timers.values()) {
      clearTimeout(timer)
    }
    this.timers.clear()
    this.pending.length = 0
  }

  get pendingCount (): number {
    return this.pending.length
  }

  private push (job: QueueJob): void {
    this.pending.push({ job, availableAt: Date.now() })
    if (this.running && !this.draining) {
      void this.drain()
    }
  }

  private async drain (): Promise<void> {
    if (this.draining) {
      return
    }
    this.draining = true
    try {
      while (this.running && this.handler != null && this.pending.length > 0) {
        const entry = this.pending.shift()
        if (entry == null) {
          continue
        }
        const { job } = entry
        try {
          await this.handler(job)
        } catch (error) {
          job.attempts += 1
          if (job.attempts < job.maxAttempts) {
            logger.warn('Retrying failed job', { jobId: job.id, name: job.name, attempt: job.attempts })
            this.pending.push({ job, availableAt: Date.now() })
          } else {
            const message = error instanceof Error ? error.message : String(error)
            logger.error('Job failed permanently', { jobId: job.id, name: job.name, error: message })
          }
        }
      }
    } finally {
      this.draining = false
    }
  }
}
