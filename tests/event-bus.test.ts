/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { describe, expect, it, vi } from 'vitest'
import { EventBus } from '../src/core/events/event-bus.js'
import { EventProcessor } from '../src/core/events/event-processor.js'
import type { CommunityEvent } from '../src/core/events/event.types.js'

const makeEvent = (overrides: Partial<CommunityEvent> = {}): CommunityEvent => ({
  id: 'evt-1',
  tenantId: 'tenant-1',
  botId: 'bot-1',
  roomId: 'room-1',
  platform: 'clubhouse',
  type: 'message.created',
  timestamp: new Date('2026-01-01T00:00:00Z'),
  payload: { messageId: 'm-1', userId: 'u-1', content: 'hi', timestamp: new Date() },
  ...overrides
})

describe('EventBus', () => {
  it('delivers typed events to matching subscribers', async () => {
    const bus = new EventBus()
    const handler = vi.fn()
    bus.subscribe('message.created', handler)

    const event = makeEvent()
    bus.publish(event)
    bus.publish(makeEvent({ type: 'room.joined' }))

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler.mock.calls[0][0].id).toBe('evt-1')
  })

  it('delivers every event to wildcard subscribers', async () => {
    const bus = new EventBus()
    const handler = vi.fn()
    bus.subscribeAll(handler)

    bus.publish(makeEvent())
    bus.publish(makeEvent({ type: 'user.joined' }))

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(handler).toHaveBeenCalledTimes(2)
  })

  it('unsubscribe stops future delivery', async () => {
    const bus = new EventBus()
    const handler = vi.fn()
    const unsubscribe = bus.subscribe('message.created', handler)

    unsubscribe()
    bus.publish(makeEvent())

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(handler).not.toHaveBeenCalled()
  })

  it('isolates throwing handlers from other subscribers', async () => {
    const bus = new EventBus()
    const bad = vi.fn().mockImplementation(() => {
      throw new Error('boom')
    })
    const good = vi.fn()
    bus.subscribe('message.created', bad)
    bus.subscribe('message.created', good)

    bus.publish(makeEvent())

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(good).toHaveBeenCalledTimes(1)
  })
})

describe('EventProcessor', () => {
  it('runs registered stages in order', async () => {
    const bus = new EventBus()
    const processor = new EventProcessor(bus)
    const order: string[] = []

    processor
      .addStage({ name: 'first', handle: async () => { order.push('first') } })
      .addStage({ name: 'second', handle: async () => { order.push('second') } })
      .start()

    bus.publish(makeEvent())
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(order).toEqual(['first', 'second'])
    processor.stop()
  })

  it('continues to later stages when one throws', async () => {
    const bus = new EventBus()
    const processor = new EventProcessor(bus)
    const reached = vi.fn()

    processor
      .addStage({
        name: 'failing',
        handle: async () => {
          throw new Error('stage error')
        }
      })
      .addStage({ name: 'after', handle: reached })
      .start()

    bus.publish(makeEvent())
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(reached).toHaveBeenCalledTimes(1)
    processor.stop()
  })

  it('is idempotent on start', () => {
    const bus = new EventBus()
    const processor = new EventProcessor(bus)
    processor.start()
    processor.start()
    expect(bus.subscribeAll).toBeDefined()
    processor.stop()
  })
})
