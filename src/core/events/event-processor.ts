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
 * Result a stage may return. Stages must not throw for expected control flow;
 * use explicit results so the processor can mark events retryable or terminal.
 */
export type EventStageResult =
  | { type: 'continue' }
  | { type: 'block' }
  | { type: 'retry', reason: string }
  | { type: 'fail', reason: string }

export const continueStage = (): EventStageResult => ({ type: 'continue' })
export const blockStage = (): EventStageResult => ({ type: 'block' })
export const retryStage = (reason: string): EventStageResult => ({ type: 'retry', reason })
export const failStage = (reason: string): EventStageResult => ({ type: 'fail', reason })

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
 */
export class EventProcessor {
  private readonly stages: EventStageHandler[] = []
  private readonly unsubscribers: Array<() => void> = []
  private recovering = false

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
    void this.recover()
  }

  stop (): void {
    this.unsubscribers.forEach((unsubscribe) => {
      unsubscribe()
    })
    this.unsubscribers.length = 0
  }

  /**
   * Drains recoverable events in bounded batches until the backlog is empty.
   * Runs asynchronously so HTTP startup is not blocked indefinitely.
   */
  private async recover (): Promise<void> {
    if (this.recovering) {
      return
    }
    this.recovering = true
    try {
      for (;;) {
        const pending = await this.deps.eventStore.recover({ limit: 100 })
        if (pending.length === 0) {
          break
        }
        logger.info('Recovering incomplete events', { count: pending.length })
        for (const event of pending) {
          this.deps.bus.publish(event)
        }
        if (pending.length < 100) {
          break
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error('Event recovery failed', { error: message })
    } finally {
      this.recovering = false
    }
  }

  private async handle (event: CommunityEvent<unknown>): Promise<void> {
    const claimed = await this.deps.eventStore.claim(event.id, event.tenantId)
    if (!claimed) {
      return
    }
    try {
      for (const stage of this.stages) {
        let result: EventStageResult
        try {
          result = await stage.handle(event)
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          logger.error('Event stage threw', { stage: stage.name, type: event.type, error: message })
          await this.deps.eventStore.markFailed(event.id, event.tenantId, message)
          return
        }
        if (result.type === 'block') {
          logger.debug('Event blocked by stage', {
            stage: stage.name,
            type: event.type,
            botId: event.botId,
            roomId: event.roomId
          })
          break
        }
        if (result.type === 'retry') {
          await this.deps.eventStore.markFailed(event.id, event.tenantId, result.reason)
          return
        }
        if (result.type === 'fail') {
          await this.deps.eventStore.markFailed(event.id, event.tenantId, result.reason)
          return
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
