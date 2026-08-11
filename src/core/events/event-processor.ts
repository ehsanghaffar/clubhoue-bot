/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type { CommunityEvent } from './event.types.js'
import type { EventBus } from './event-bus.js'
import { eventBus } from './event-bus.js'
import logger from '../../utils/logger.js'

/**
 * A single step in the event pipeline. Stages are registered in order and run
 * sequentially for each event (e.g. moderation -> automation -> usage).
 */
export interface EventStageHandler {
  readonly name: string
  handle: (event: CommunityEvent<unknown>) => Promise<void> | void
}

/**
 * Routes every published community event through a fixed pipeline of stage
 * handlers. A failing stage is logged but does not prevent later stages from
 * running, keeping one subsystem's errors from taking down the others.
 */
export class EventProcessor {
  private readonly stages: EventStageHandler[] = []
  private readonly unsubscribers: Array<() => void> = []

  constructor (private readonly bus: EventBus) {}

  addStage (stage: EventStageHandler): this {
    this.stages.push(stage)
    return this
  }

  start (): void {
    if (this.unsubscribers.length > 0) {
      return
    }
    this.unsubscribers.push(this.bus.subscribeAll((event) => {
      void this.process(event)
    }))
    logger.info('Event processor started with stages:', {
      stages: this.stages.map((s) => s.name)
    })
  }

  stop (): void {
    this.unsubscribers.forEach((unsubscribe) => {
      unsubscribe()
    })
    this.unsubscribers.length = 0
  }

  private async process (event: CommunityEvent<unknown>): Promise<void> {
    for (const stage of this.stages) {
      try {
        await stage.handle(event)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        logger.error('Event stage failed', {
          stage: stage.name,
          type: event.type,
          error: message
        })
      }
    }
  }
}

export const eventProcessor = new EventProcessor(eventBus)
