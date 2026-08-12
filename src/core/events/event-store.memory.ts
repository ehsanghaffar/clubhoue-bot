/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type { CommunityEvent } from './event.types.js'
import type { EventStore } from './event-store.js'
import type { CommunityEventStatus } from '../../models/communityEvent.js'
import { MAX_EVENT_ATTEMPTS } from './event-store.js'

interface EventRow {
  event: CommunityEvent<unknown>
  status: CommunityEventStatus
  attempts: number
  error?: string
  processedAt?: Date
  createdAt: Date
}

type StatusCounts = Record<CommunityEventStatus, number>

/**
 * In-memory EventStore for unit tests. Mirrors the Mongo implementation's
 * state machine (pending -> processing -> processed/failed) and bounded retry,
 * without requiring a database.
 */
export class InMemoryEventStore implements EventStore {
  private readonly rows = new Map<string, EventRow>()

  async persist (event: CommunityEvent<unknown>): Promise<void> {
    const existing = this.rows.get(event.id)
    if (existing != null) {
      return
    }
    this.rows.set(event.id, {
      event,
      status: 'pending',
      attempts: 0,
      createdAt: new Date()
    })
  }

  async claim (eventId: string, tenantId: string): Promise<boolean> {
    const row = this.rows.get(eventId)
    if (row != null) {
      if (row.event.tenantId !== tenantId) {
        return false
      }
      if (row.status === 'processed' || row.status === 'failed' || row.status === 'processing') {
        return false
      }
      row.status = 'processing'
      row.attempts += 1
      return true
    }
    // Optimistic claim: the event arrived via the bus but was not pre-persisted
    // (e.g. direct bus publish). Track it now so the failure path can retry it.
    this.rows.set(eventId, {
      event: { id: eventId, tenantId, botId: '', roomId: '', platform: 'clubhouse', type: 'message.created', timestamp: new Date(), payload: {} },
      status: 'processing',
      attempts: 1,
      createdAt: new Date()
    })
    return true
  }

  async markProcessed (eventId: string, tenantId: string): Promise<void> {
    const row = this.rows.get(eventId)
    if (row == null || row.event.tenantId !== tenantId) {
      return
    }
    row.status = 'processed'
    row.processedAt = new Date()
    row.error = undefined
  }

  async markFailed (eventId: string, tenantId: string, error: string): Promise<void> {
    const row = this.rows.get(eventId)
    if (row == null || row.event.tenantId !== tenantId) {
      return
    }
    row.error = error.slice(0, 500)
    row.status = row.attempts >= MAX_EVENT_ATTEMPTS ? 'failed' : 'pending'
  }

  async recover (options: { limit?: number, staleMs?: number } = {}): Promise<Array<CommunityEvent<unknown>>> {
    const limit = options.limit ?? 100
    const now = Date.now()
    const staleMs = options.staleMs ?? (2 * 60 * 1000)
    const result: Array<CommunityEvent<unknown>> = []
    for (const row of [...this.rows.values()].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())) {
      if (result.length >= limit) {
        break
      }
      if (row.status === 'pending') {
        result.push(row.event)
      } else if (row.status === 'failed' && row.attempts < MAX_EVENT_ATTEMPTS) {
        result.push(row.event)
      } else if (row.status === 'processing' && (now - row.createdAt.getTime()) > staleMs) {
        result.push(row.event)
      }
    }
    return result
  }

  async stats (tenantId: string): Promise<StatusCounts> {
    const result: StatusCounts = { pending: 0, processing: 0, processed: 0, failed: 0 }
    for (const row of this.rows.values()) {
      if (row.event.tenantId === tenantId) {
        result[row.status] += 1
      }
    }
    return result
  }

  // --- test helpers ---

  reset (): void {
    this.rows.clear()
  }

  row (eventId: string): EventRow | undefined {
    return this.rows.get(eventId)
  }

  setStatus (eventId: string, status: CommunityEventStatus): void {
    const row = this.rows.get(eventId)
    if (row != null) {
      row.status = status
    }
  }
}
