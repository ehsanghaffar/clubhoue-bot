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
        const result = await stage.handle(event)
        // A stage that returns 'block' gates the event: remaining stages
        // (automation, AI, usage) must not observe it.
        if (result === 'block') {
          logger.debug('Event blocked by stage', {
            stage: stage.name,
            type: event.type,
            botId: event.botId,
            roomId: event.roomId
          })
          return
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
  }
}

export const eventProcessor = new EventProcessor(eventBus)
