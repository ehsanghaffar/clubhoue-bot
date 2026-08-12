/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { describe, expect, it, vi } from 'vitest'
import { InMemoryEventStore } from '../src/core/events/event-store.memory.js'
import { MAX_EVENT_ATTEMPTS } from '../src/core/events/event-store.js'

const makeEvent = (id: string, tenantId = 'tenant-1', overrides: Record<string, unknown> = {}) => ({
  id,
  tenantId,
  botId: 'bot-1',
  roomId: 'room-1',
  platform: 'clubhouse' as const,
  type: 'message.created' as const,
  timestamp: new Date(),
  payload: { messageId: id, userId: 'u-1', content: 'hi', timestamp: new Date() },
  ...overrides
})

describe('InMemoryEventStore', () => {
  it('persists an event and is idempotent on duplicate id', async () => {
    const store = new InMemoryEventStore()
    await store.persist(makeEvent('evt-1'))
    await store.persist(makeEvent('evt-1'))
    const stats = await store.stats('tenant-1')
    expect(stats.pending).toBe(1)
  })

  it('claims a pending event and transitions pending -> processing', async () => {
    const store = new InMemoryEventStore()
    await store.persist(makeEvent('evt-1'))
    const claimed = await store.claim('evt-1', 'tenant-1')
    expect(claimed).toBe(true)
    expect(store.row('evt-1')?.status).toBe('processing')
    expect(store.row('evt-1')?.attempts).toBe(1)
  })

  it('does not claim an event belonging to another tenant', async () => {
    const store = new InMemoryEventStore()
    await store.persist(makeEvent('evt-1', 'tenant-1'))
    const claimed = await store.claim('evt-1', 'tenant-2')
    expect(claimed).toBe(false)
    expect(store.row('evt-1')?.status).toBe('pending')
  })

  it('marks a claimed event processed', async () => {
    const store = new InMemoryEventStore()
    await store.persist(makeEvent('evt-1'))
    await store.claim('evt-1', 'tenant-1')
    await store.markProcessed('evt-1', 'tenant-1')
    expect(store.row('evt-1')?.status).toBe('processed')
    expect(store.row('evt-1')?.processedAt).toBeInstanceOf(Date)
  })

  it('does not double-claim an already-processed event', async () => {
    const store = new InMemoryEventStore()
    await store.persist(makeEvent('evt-1'))
    await store.claim('evt-1', 'tenant-1')
    await store.markProcessed('evt-1', 'tenant-1')
    const claimedAgain = await store.claim('evt-1', 'tenant-1')
    expect(claimedAgain).toBe(false)
  })

  it('recovers pending events', async () => {
    const store = new InMemoryEventStore()
    await store.persist(makeEvent('evt-1'))
    await store.persist(makeEvent('evt-2', 'tenant-2'))
    const recovered = await store.recover()
    expect(recovered).toHaveLength(2)
  })

  it('excludes processed events from recovery', async () => {
    const store = new InMemoryEventStore()
    await store.persist(makeEvent('evt-1'))
    await store.claim('evt-1', 'tenant-1')
    await store.markProcessed('evt-1', 'tenant-1')
    await store.persist(makeEvent('evt-2'))
    const recovered = await store.recover()
    expect(recovered.map((e) => e.id)).toEqual(['evt-2'])
  })

  describe('bounded retry', () => {
    it('returns a failed event to pending while attempts remain', async () => {
      const store = new InMemoryEventStore()
      await store.persist(makeEvent('evt-1'))
      await store.claim('evt-1', 'tenant-1')
      await store.markFailed('evt-1', 'tenant-1', 'boom')
      expect(store.row('evt-1')?.status).toBe('pending')
      expect(store.row('evt-1')?.attempts).toBe(2)
      expect(store.row('evt-1')?.error).toBe('boom')
    })

    it('marks an event failed once the attempt limit is reached', async () => {
      const store = new InMemoryEventStore()
      await store.persist(makeEvent('evt-1'))
      await store.claim('evt-1', 'tenant-1')
      await store.markFailed('evt-1', 'tenant-1', 'fail-1')
      await store.claim('evt-1', 'tenant-1')
      await store.markFailed('evt-1', 'tenant-1', 'fail-2')
      expect(store.row('evt-1')?.status).toBe('failed')
      expect(store.row('evt-1')?.attempts).toBe(MAX_EVENT_ATTEMPTS + 1)
    })

    it('does not recover a terminally-failed event', async () => {
      const store = new InMemoryEventStore()
      await store.persist(makeEvent('evt-1'))
      await store.claim('evt-1', 'tenant-1')
      await store.markFailed('evt-1', 'tenant-1', 'fail-1')
      await store.claim('evt-1', 'tenant-1')
      await store.markFailed('evt-1', 'tenant-1', 'fail-2')
      const recovered = await store.recover()
      expect(recovered).toHaveLength(0)
    })
  })

  it('reports tenant-scoped stats', async () => {
    const store = new InMemoryEventStore()
    await store.persist(makeEvent('evt-1', 'tenant-1'))
    await store.persist(makeEvent('evt-2', 'tenant-1'))
    await store.persist(makeEvent('evt-3', 'tenant-2'))
    const stats = await store.stats('tenant-1')
    expect(stats.pending).toBe(2)
    const statsB = await store.stats('tenant-2')
    expect(statsB.pending).toBe(1)
  })

  it('optimistically claims an event published directly to the bus (no persist)', async () => {
    const store = new InMemoryEventStore()
    const claimed = await store.claim('direct-evt', 'tenant-1')
    expect(claimed).toBe(true)
    expect(store.row('direct-evt')?.status).toBe('processing')
  })
})

describe('EventProcessor + EventStore integration (crash recovery)', () => {
  it('processes an event end to end and marks it processed', async () => {
    const { EventBus } = await import('../src/core/events/event-bus.js')
    const { EventProcessor } = await import('../src/core/events/event-processor.js')
    const bus = new EventBus()
    const store = new InMemoryEventStore()
    const processor = new EventProcessor({ bus, eventStore: store })
    const handled = vi.fn()
    processor.addStage({ name: 'probe', handle: handled })
    processor.start()

    bus.publish(makeEvent('evt-1'))
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(handled).toHaveBeenCalledTimes(1)
    expect(store.row('evt-1')?.status).toBe('processed')
    processor.stop()
  })

  it('recovers and re-processes a pending event after restart', async () => {
    const { EventBus } = await import('../src/core/events/event-bus.js')
    const { EventProcessor } = await import('../src/core/events/event-processor.js')
    const bus = new EventBus()
    const store = new InMemoryEventStore()
    await store.persist(makeEvent('stuck'))
    // Simulate a prior process crash: the event was persisted but never claimed/processed.

    const handled = vi.fn()
    const processor = new EventProcessor({ bus, eventStore: store })
    processor.addStage({ name: 'probe', handle: handled })
    processor.start()

    await vi.waitFor(() => {
      expect(handled).toHaveBeenCalledTimes(1)
    })
    expect(store.row('stuck')?.status).toBe('processed')
    processor.stop()
  })

  it('does not create duplicate AI responses for a duplicate event (idempotency)', async () => {
    const { EventBus } = await import('../src/core/events/event-bus.js')
    const { EventProcessor } = await import('../src/core/events/event-processor.js')
    const bus = new EventBus()
    const store = new InMemoryEventStore()
    const processor = new EventProcessor({ bus, eventStore: store })
    const handled = vi.fn()
    processor.addStage({ name: 'probe', handle: handled })
    processor.start()

    bus.publish(makeEvent('dup'))
    bus.publish(makeEvent('dup'))
    await new Promise((resolve) => setTimeout(resolve, 0))

    // The second publish collides on the deterministic id and is processed once.
    expect(handled).toHaveBeenCalledTimes(1)
    expect(store.row('dup')?.status).toBe('processed')
    processor.stop()
  })
})
