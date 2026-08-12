/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type { CommunityEvent } from './event.types.js'
import type { EventBus } from './event-bus.js'
import { eventBus as defaultBus } from './event-bus.js'
import type { EventStore } from './event-store.js'
import { eventStore as defaultEventStore } from './event-store.impl.js'
import logger from '../../utils/logger.js'

/**
 * Result a stage may return. Returning `'block'` stops the pipeline for the
 * current event so later stages (e.g. automation, usage) never see it. Used by
 * the moderation stage to gate messages before they reach AI/automation.
 */
export type EventStageResult = void | 'block'

/**
 * A single step in the event pipeline. Stages are registered in order and run
 * sequentially for each event (e.g. moderation -> automation -> usage).
 */
export interface EventStageHandler {
  readonly name: string
  handle: (event: CommunityEvent<unknown>) => Promise<EventStageResult> | EventStageResult
}

export interface EventProcessorDeps {
  bus: EventBus
  eventStore: EventStore
}

/**
 * Routes every published community event through a fixed pipeline of stage
 * handlers. Each event is durably tracked by the EventStore: it is claimed
 * (pending -> processing) before stages run, and marked processed/failed after.
 *
 * On start, the processor recovers events left incomplete by a prior run
 * (crash recovery) and re-runs them through the pipeline.
 */
export class EventProcessor {
  private readonly stages: EventStageHandler[] = []
  private readonly unsubscribers: Array<() => void> = []

  constructor (private readonly deps: EventProcessorDeps = { bus: defaultBus, eventStore: defaultEventStore }) {}

  addStage (stage: EventStageHandler): this {
    this.stages.push(stage)
    return this
  }

  start (): void {
    if (this.unsubscribers.length > 0) {
      return
    }
    this.unsubscribers.push(this.deps.bus.subscribeAll((event) => {
      void this.handle(event)
    }))
    logger.info('Event processor started with stages:', {
      stages: this.stages.map((s) => s.name)
    })
    // Recover events left pending/processing by a previous process run.
    void this.recover()
  }

  stop (): void {
    this.unsubscribers.forEach((unsubscribe) => {
      unsubscribe()
    })
    this.unsubscribers.length = 0
  }

  /**
   * Recovers incomplete events from the durable store and re-dispatches them
   * through the in-memory bus so the pipeline processes them. Bounded so a
   * large backlog cannot stall startup.
   */
  private async recover (): Promise<void> {
    try {
      const pending = await this.deps.eventStore.recover({ limit: 100 })
      if (pending.length === 0) {
        return
      }
      logger.info('Recovering incomplete events', { count: pending.length })
      for (const event of pending) {
        this.deps.bus.publish(event)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error('Event recovery failed', { error: message })
    }
  }

  /**
   * Handles a single event: claim it durably, run the pipeline, then mark it
   * processed. A stage returning 'block' gates the event but still counts as
   * successfully processed.
   *
   * Per-stage errors are logged and swallowed (never re-thrown) so one broken
   * stage cannot take down the pipeline for later stages — this preserves the
   * original stage-isolation guarantee. The durable store only sees a 'failed'
   * transition for catastrophic infrastructure errors, not routine stage
   * exceptions, which is what bounded retry is for.
   */
  private async handle (event: CommunityEvent<unknown>): Promise<void> {
    const claimed = await this.deps.eventStore.claim(event.id, event.tenantId)
    if (!claimed) {
      // Already processed, failed-terminally, or claimed by another worker.
      return
    }
    try {
      for (const stage of this.stages) {
        try {
          const result = await stage.handle(event)
          if (result === 'block') {
            logger.debug('Event blocked by stage', {
              stage: stage.name,
              type: event.type,
              botId: event.botId,
              roomId: event.roomId
            })
            break
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          logger.error('Event stage failed', {
            stage: stage.name,
            type: event.type,
            error: message
          })
        }
      }
      await this.deps.eventStore.markProcessed(event.id, event.tenantId)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error('Event processing failed', {
        type: event.type,
        botId: event.botId,
        roomId: event.roomId,
        error: message
      })
      await this.deps.eventStore.markFailed(event.id, event.tenantId, message)
    }
  }
}

export const eventProcessor = new EventProcessor()
