/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type { CommunityEvent } from './event.types.js'
import type { EventStore } from './event-store.js'
import type { CommunityEventStatus } from '../../models/communityEvent.js'
import { CommunityEventModel } from '../../models/communityEvent.js'
import { computeExpiry, MAX_EVENT_ATTEMPTS } from './event-store.js'
import logger from '../../utils/logger.js'

const RECOVER_LIMIT = 100
const STALE_PROCESSING_MS = 2 * 60 * 1000

/**
 * Mongo-backed EventStore. The deterministic event id is used as the document
 * _id, which makes persist() naturally idempotent (duplicate-key on re-insert)
 * and gives every event query a covered unique index.
 */
export class MongoEventStore implements EventStore {
  async persist (event: CommunityEvent<unknown>): Promise<void> {
    // Upsert keyed on the deterministic _id. Only the first write sets status
    // pending; a duplicate event (same id) leaves the existing record untouched
    // so it is processed exactly once.
    await CommunityEventModel.updateOne(
      { _id: event.id },
      {
        $setOnInsert: {
          _id: event.id,
          tenantId: event.tenantId,
          botId: event.botId,
          roomId: event.roomId,
          platform: event.platform,
          type: event.type,
          occurredAt: event.timestamp,
          payload: event.payload,
          status: 'pending',
          attempts: 0,
          expiresAt: computeExpiry('pending')
        }
      },
      { upsert: true }
    ).catch((err: unknown) => {
      // Race with a concurrent upsert of the same id: ignore duplicate key.
      if ((err as { code?: number }).code === 11000) {
        return
      }
      throw err
    })
  }

  async claim (eventId: string, tenantId: string): Promise<boolean> {
    const now = new Date()
    const staleBefore = new Date(now.getTime() - STALE_PROCESSING_MS)
    // Atomically claim: pending always; processing only if stale (dead owner).
    // The tenant filter is the defense-in-depth boundary — a claim never moves
    // another tenant's event.
    const res = await CommunityEventModel.findOneAndUpdate(
      {
        _id: eventId,
        tenantId,
        $or: [
          { status: 'pending' },
          { status: 'processing', updatedAt: { $lt: staleBefore } },
          { status: 'failed', attempts: { $lt: MAX_EVENT_ATTEMPTS } }
        ]
      },
      {
        $set: { status: 'processing', error: undefined },
        $inc: { attempts: 1 },
        $setOnInsert: { expiresAt: computeExpiry('processing', now) }
      },
      { new: true }
    ).lean()
    return res != null
  }

  async markProcessed (eventId: string, tenantId: string): Promise<void> {
    const now = new Date()
    await CommunityEventModel.updateOne(
      { _id: eventId, tenantId, status: 'processing' },
      {
        $set: {
          status: 'processed',
          processedAt: now,
          error: undefined,
          expiresAt: computeExpiry('processed', now)
        }
      }
    )
  }

  async markFailed (eventId: string, tenantId: string, error: string): Promise<void> {
    const doc = await CommunityEventModel.findOne({ _id: eventId, tenantId }).lean()
    if (doc == null) {
      return
    }
    const attempts = doc.attempts
    const terminal = attempts >= MAX_EVENT_ATTEMPTS
    const status: CommunityEventStatus = terminal ? 'failed' : 'pending'
    await CommunityEventModel.updateOne(
      { _id: eventId, tenantId },
      {
        $set: {
          status,
          error: error.slice(0, 500),
          expiresAt: computeExpiry(status)
        }
      }
    )
    if (terminal) {
      logger.error('Event reached max attempts, marked failed', { eventId, tenantId, attempts })
    }
  }

  async recover (options: { limit?: number, staleMs?: number } = {}): Promise<Array<CommunityEvent<unknown>>> {
    const limit = options.limit ?? RECOVER_LIMIT
    const staleMs = options.staleMs ?? STALE_PROCESSING_MS
    const now = new Date()
    const staleBefore = new Date(now.getTime() - staleMs)

    const docs = await CommunityEventModel.find({
      $or: [
        { status: 'pending' },
        { status: 'processing', updatedAt: { $lt: staleBefore } },
        { status: 'failed', attempts: { $lt: MAX_EVENT_ATTEMPTS } }
      ]
    })
      .sort({ createdAt: 1 })
      .limit(limit)
      .lean()

    return docs.map((doc) => ({
      id: doc._id,
      tenantId: doc.tenantId,
      botId: doc.botId,
      roomId: doc.roomId,
      platform: doc.platform,
      type: doc.type,
      timestamp: doc.occurredAt,
      payload: doc.payload
    }))
  }

  async stats (tenantId: string): Promise<Record<CommunityEventStatus, number>> {
    const rows = await CommunityEventModel.aggregate([
      { $match: { tenantId } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ])
    const result: Record<CommunityEventStatus, number> = { pending: 0, processing: 0, processed: 0, failed: 0 }
    for (const row of rows) {
      result[row._id as CommunityEventStatus] = row.count
    }
    return result
  }
}

export const eventStore: EventStore = new MongoEventStore()
