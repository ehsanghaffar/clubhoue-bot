/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type { CommunityEvent, CommunityEventType } from './event.types.js'
import logger from '../../utils/logger.js'

type AnyEventHandler = (event: CommunityEvent<never>) => void | Promise<void>

/**
 * Typed in-process publish/subscribe bus for normalized community events.
 * Handlers may be async; each invocation is fire-and-forget and failures are
 * logged so a misbehaving handler never crashes the publisher. This is the
 * event backbone used by the room service, automation engine, moderation and
 * usage tracking.
 */
export class EventBus {
  private readonly typed = new Map<CommunityEventType, Set<AnyEventHandler>>()
  private readonly wildcard = new Set<AnyEventHandler>()

  /**
   * Subscribes to a single event type. Returns an unsubscribe function.
   */
  subscribe<T = unknown> (
    type: CommunityEventType,
    handler: (event: CommunityEvent<T>) => void | Promise<void>
  ): () => void {
    let set = this.typed.get(type)
    if (set == null) {
      set = new Set()
      this.typed.set(type, set)
    }
    const fn = handler as unknown as AnyEventHandler
    set.add(fn)
    return () => {
      set.delete(fn)
    }
  }

  /**
   * Subscribes to every event type. Returns an unsubscribe function.
   */
  subscribeAll (handler: (event: CommunityEvent<unknown>) => void | Promise<void>): () => void {
    const fn = handler as unknown as AnyEventHandler
    this.wildcard.add(fn)
    return () => {
      this.wildcard.delete(fn)
    }
  }

  /**
   * Publishes an event to matching typed and wildcard subscribers. Handlers
   * run asynchronously and independently; publish never awaits them.
   */
  publish<T = unknown> (event: CommunityEvent<T>): void {
    const dispatch = async (fn: AnyEventHandler): Promise<void> => {
      try {
        await fn(event as CommunityEvent<never>)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        logger.error('Event handler failed', {
          type: event.type,
          error: message
        })
      }
    }

    const set = this.typed.get(event.type)
    if (set != null) {
      for (const fn of set) {
        void dispatch(fn)
      }
    }
    for (const fn of this.wildcard) {
      void dispatch(fn)
    }
  }
}

export const eventBus = new EventBus()
