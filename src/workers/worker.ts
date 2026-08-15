/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type { JobQueue, QueueJob } from '../infrastructure/queue/queue.js'
import type { JobHandlerMap } from './handlers.js'
import logger from '../utils/logger.js'

/**
 * Consumes jobs from a queue and dispatches them to the registered handlers.
 * Unknown job names are logged and skipped; a handler that throws is caught so
 * a single bad job does not stop the worker.
 */
export class Worker {
  private running = false

  constructor (
    private readonly queue: JobQueue,
    private readonly handlers: JobHandlerMap
  ) {}

  start (): void {
    if (this.running) {
      return
    }
    this.running = true
    this.queue.process(async (job: QueueJob) => {
      const handler = this.handlers[job.name as keyof JobHandlerMap]
      if (handler == null) {
        logger.warn('No handler for job', { jobId: job.id, name: job.name })
        return
      }
      try {
        await handler(job)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        logger.error('Worker job failed', { jobId: job.id, name: job.name, error: message })
        throw error
      }
    })
    this.queue.start()
    logger.info('Worker started')
  }

  stop (): void {
    this.running = false
    this.queue.stop()
    logger.info('Worker stopped')
  }
}
