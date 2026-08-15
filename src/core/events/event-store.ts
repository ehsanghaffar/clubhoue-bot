/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type { CommunityEvent } from './event.types.js'
import type { CommunityEventStatus } from '../../models/communityEvent.js'

export const MAX_EVENT_ATTEMPTS = 3
export const PROCESSED_EVENT_TTL_DAYS = 30

/**
 * Result of an atomic event claim. `claimed: true` is the only way a caller
 * may run the processing stages; the returned `claimId` is a per-claim
 * ownership token that must be presented to mark the event processed or
 * failed, so a stale owner can never mutate a successor's claim.
 */
export type EventClaim =
  | { claimed: true, claimId: string }
  | { claimed: false }

/**
 * Durable event persistence. The EventProcessor hands each normalized event to
 * the store, which is responsible for:
 *   - persisting it before any in-memory processing (crash safety),
 *   - tracking processing state (pending -> processing -> processed/failed),
 *   - bounded retries for transient failures,
 *   - recovering events left incomplete by a prior process run,
 *   - tenant-scoped, idempotent writes (stable event ids).
 *
 * The interface is storage-agnostic so the MVP Mongo implementation can later
 * be swapped for a queue-backed one without touching the processor.
 */
export interface EventStore {
  /**
   * Persists an event. Idempotent on the event id: a second call for an event
   * already present is a no-op (returns the existing record) so duplicate
   * platform events never produce duplicate processing.
   */
  persist: (event: CommunityEvent<unknown>) => Promise<void>

  /**
   * Atomically claims an event for processing, transitioning it pending ->
   * processing and bumping the attempt counter. Returns the claim ownership
   * token if this caller claimed it, `{ claimed: false }` if it was already
   * claimed/processed/failed. The atomic claim is what lets future workers
   * process the same store without overlap.
   */
  claim: (eventId: string, tenantId: string) => Promise<EventClaim>

  /** Marks a claimed event successfully processed (only while the claim is owned). */
  markProcessed: (eventId: string, tenantId: string, claimId: string) => Promise<void>

  /**
   * Records a processing failure. Bounded retry: while attempts remain the
   * event is returned to pending so recovery re-processes it; once the attempt
   * limit is hit it is moved to a terminal failed state.
   */
  markFailed: (eventId: string, tenantId: string, claimId: string, error: string) => Promise<void>

  /**
   * Returns events that still need processing: any pending event, plus
   * processing events stuck longer than `staleMs` (owned by a dead process).
   * Results are ordered oldest-first and bounded by `limit`.
   */
  recover: (options?: { limit?: number, staleMs?: number }) => Promise<Array<CommunityEvent<unknown>>>

  /** Tenant-scoped status counts for observability. */
  stats: (tenantId: string) => Promise<Record<CommunityEventStatus, number>>
}

export const computeExpiry = (status: CommunityEventStatus, now = new Date()): Date | undefined => {
  if (status === 'processed') {
    return new Date(now.getTime() + PROCESSED_EVENT_TTL_DAYS * 24 * 60 * 60 * 1000)
  }
  // pending / processing / failed must never be TTL-deleted.
  return undefined
}
