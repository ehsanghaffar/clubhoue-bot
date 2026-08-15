/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { randomUUID } from 'node:crypto'
import type { QueryFilter, UpdateQuery } from 'mongoose'
import { ActionRecordModel, type ActionRecordDoc, type ActionRecordStatus } from '../../models/actionRecord.js'

export type ActionType = 'ai_response' | 'welcome' | 'speaker_invite'

/**
 * Explicit claim outcome. `acquired: true` is the only way a caller may
 * execute the external side effect; losers are told why they lost instead of
 * having to infer ownership from raw document state. The returned `claimId`
 * is a per-claim ownership token: every subsequent mutation of the record
 * must present it, so a stale owner can never touch a successor's claim.
 */
export type ActionClaim =
  | { acquired: true, claimId: string }
  | { acquired: false, reason: 'processing' | 'executed' | 'failed' }

/** Ownership/identity fields stamped onto the record when it is first created. */
export interface ActionClaimMetadata {
  actionType: ActionType
  ruleId: string
  eventId: string
  botId: string
  roomId: string
}

export interface ActionIdempotencyStore {
  /**
   * Atomically claims an action key. Exactly one concurrent caller receives
   * `acquired: true` for a given key; the rest are told the current reason
   * (`processing` with an active lease, `executed`, or terminal `failed`).
   */
  claim: (tenantId: string, key: string, metadata?: ActionClaimMetadata) => Promise<ActionClaim>
  /** Marks a held claim as successfully executed (only while the claim is owned). */
  markExecuted: (tenantId: string, key: string, claimId: string) => Promise<void>
  /** Records an external failure; leaves the action retryable until the attempt budget is spent. */
  markFailed: (tenantId: string, key: string, claimId: string, error: string) => Promise<void>
  /** Returns a held, unexecuted claim to `pending` without consuming the retry budget. */
  release: (tenantId: string, key: string, claimId: string) => Promise<void>
}

/**
 * Deterministic action key. The tenant id is part of the key so the same event
 * id or rule id can never collide across tenants, and every record remains
 * queryable by tenant.
 */
export const buildActionKey = (
  tenantId: string,
  eventId: string,
  ruleId: string,
  actionType: ActionType
): string => `${actionType}:${tenantId}:${eventId}:${ruleId}`

/** How long a claim may sit in `processing` before it is considered orphaned. */
export const ACTION_LEASE_MS = 2 * 60 * 1000

/** Maximum execution attempts before an action becomes terminal `failed`. */
export const MAX_ACTION_ATTEMPTS = 5

const reasonFor = (status: ActionRecordStatus): Exclude<ActionClaim, { acquired: true }>['reason'] => {
  switch (status) {
    case 'executed':
      return 'executed'
    case 'failed':
      return 'failed'
    default:
      return 'processing'
  }
}

/**
 * Mongo-backed atomic claim store.
 *
 * The ownership decision is made entirely inside a single conditional
 * findOneAndUpdate: the record may only transition to `processing` when it is
 * `pending`, `failed` with retries remaining, or `processing` with an expired
 * lease. A concurrent caller that loses the race (or the duplicate-key insert
 * race) receives `acquired: false`. There is deliberately no application-level
 * lock and no read-modify-write ownership check.
 */
export class MongoActionIdempotencyStore implements ActionIdempotencyStore {
  private readonly leaseMs: number
  private readonly maxAttempts: number

  constructor (options: { leaseMs?: number, maxAttempts?: number } = {}) {
    this.leaseMs = options.leaseMs ?? ACTION_LEASE_MS
    this.maxAttempts = options.maxAttempts ?? MAX_ACTION_ATTEMPTS
  }

  async claim (tenantId: string, key: string, metadata?: ActionClaimMetadata): Promise<ActionClaim> {
    const now = new Date()
    const leaseUntil = new Date(now.getTime() + this.leaseMs)
    // Unique per claim attempt; the successor's claimId replaces the previous
    // owner's on reclaim, immediately revoking the old owner's authority.
    const claimId = randomUUID()

    // The record may only transition to `processing` when it is `pending`,
    // `failed` with retries remaining, or `processing` with an expired lease.
    const claimable: QueryFilter<ActionRecordDoc> = {
      _id: key,
      tenantId,
      $or: [
        { status: 'pending' },
        { status: 'failed', attempts: { $lt: this.maxAttempts } },
        { status: 'processing', leaseUntil: { $lt: now } }
      ]
    }

    const transition: UpdateQuery<ActionRecordDoc> = {
      $set: {
        status: 'processing',
        claimedAt: now,
        leaseUntil,
        claimId
      },
      $unset: { error: 1 },
      $inc: { attempts: 1 },
      $setOnInsert: {
        _id: key,
        tenantId,
        actionType: metadata?.actionType,
        ruleId: metadata?.ruleId,
        eventId: metadata?.eventId,
        botId: metadata?.botId,
        roomId: metadata?.roomId
      }
    }

    // 1. Existing claimable document: a single atomic findOneAndUpdate decides
    //    the winner. Exactly one of N concurrent callers matches the filter;
    //    the rest are rejected without an application-level lock.
    const claimed = await ActionRecordModel.findOneAndUpdate(claimable, transition, { new: true }).lean()
    if (claimed != null) {
      return { acquired: true, claimId }
    }

    // 2. No claimable document (first claim of a fresh key): atomically create
    //    it. A duplicate-key error means another caller just created the record
    //    and owns it; we do NOT re-run this upsert, because the record is now
    //    unclaimable and re-running would only re-raise the same error.
    try {
      const created = await ActionRecordModel.findOneAndUpdate(claimable, transition, { new: true, upsert: true }).lean()
      if (created != null) {
        return { acquired: true, claimId }
      }
    } catch (err: unknown) {
      if ((err as { code?: number }).code !== 11000) {
        throw err
      }
    }

    // 3. The ownership decision was already made atomically above; read the
    //    record only to report the current reason to the losing caller.
    const current = await ActionRecordModel.findOne({ _id: key, tenantId }).lean()
    if (current == null) {
      return { acquired: false, reason: 'processing' }
    }
    return { acquired: false, reason: reasonFor(current.status) }
  }

  async markExecuted (tenantId: string, key: string, claimId: string): Promise<void> {
    const now = new Date()
    // Only the current claim owner may mark executed. The record's current
    // claimId must match the caller's token and the lease must still be valid;
    // a stale owner (whose lease expired and was reclaimed) matches zero
    // documents and becomes a no-op instead of overwriting the successor.
    await ActionRecordModel.updateOne(
      { _id: key, tenantId, status: 'processing', claimId, leaseUntil: { $gt: now } },
      {
        $set: { status: 'executed', executedAt: now, leaseUntil: null, claimedAt: null },
        $unset: { error: 1 }
      }
    )
  }

  async markFailed (tenantId: string, key: string, claimId: string, error: string): Promise<void> {
    const now = new Date()
    const doc = await ActionRecordModel.findOne({
      _id: key,
      tenantId,
      status: 'processing',
      claimId,
      leaseUntil: { $gt: now }
    }).lean()
    if (doc == null) {
      return
    }
    // Bounded retry: back to `pending` while attempts remain, terminal `failed`
    // once the budget is spent. The record is never marked executed on failure.
    const status: ActionRecordStatus = doc.attempts >= this.maxAttempts ? 'failed' : 'pending'
    await ActionRecordModel.updateOne(
      { _id: key, tenantId, status: 'processing', claimId, leaseUntil: { $gt: now } },
      {
        $set: { status, error: error.slice(0, 500), leaseUntil: null, claimedAt: null }
      }
    )
  }

  async release (tenantId: string, key: string, claimId: string): Promise<void> {
    const now = new Date()
    await ActionRecordModel.updateOne(
      { _id: key, tenantId, status: 'processing', claimId, leaseUntil: { $gt: now } },
      {
        $set: { status: 'pending', leaseUntil: null, claimedAt: null },
        $unset: { error: 1 }
      }
    )
  }
}

interface InMemoryRow {
  tenantId: string
  status: ActionRecordStatus
  attempts: number
  claimedAt?: Date
  leaseUntil?: Date
  claimId?: string
  executedAt?: Date
  error?: string
}

/**
 * In-memory mirror of the Mongo state machine for offline unit tests. It
 * enforces the same status/lease/retry rules so rule-level tests exercise the
 * same semantics; the concurrency guarantees themselves are proven against the
 * real Mongo store in the integration suite.
 */
export class InMemoryActionIdempotencyStore implements ActionIdempotencyStore {
  private readonly rows = new Map<string, InMemoryRow>()
  private readonly leaseMs: number
  private readonly maxAttempts: number

  constructor (options: { leaseMs?: number, maxAttempts?: number } = {}) {
    this.leaseMs = options.leaseMs ?? ACTION_LEASE_MS
    this.maxAttempts = options.maxAttempts ?? MAX_ACTION_ATTEMPTS
  }

  private scopedKey (tenantId: string, key: string): string {
    return `${tenantId}:${key}`
  }

  private leaseActive (row: InMemoryRow, now: number): boolean {
    return row.status === 'processing' && row.leaseUntil != null && row.leaseUntil.getTime() > now
  }

  async claim (tenantId: string, key: string): Promise<ActionClaim> {
    const now = Date.now()
    const scoped = this.scopedKey(tenantId, key)
    const row = this.rows.get(scoped)
    const claimId = randomUUID()

    if (row != null) {
      const stale = row.status === 'processing' && row.leaseUntil != null && row.leaseUntil.getTime() <= now
      const retryable = row.status === 'failed' && row.attempts < this.maxAttempts

      if (row.status === 'executed') {
        return { acquired: false, reason: 'executed' }
      }
      if (row.status === 'failed' && !retryable) {
        return { acquired: false, reason: 'failed' }
      }
      if (row.status === 'processing' && !stale) {
        return { acquired: false, reason: 'processing' }
      }

      row.status = 'processing'
      row.attempts += 1
      row.claimedAt = new Date(now)
      row.leaseUntil = new Date(now + this.leaseMs)
      row.claimId = claimId
      row.error = undefined
      return { acquired: true, claimId }
    }

    this.rows.set(scoped, {
      tenantId,
      status: 'processing',
      attempts: 1,
      claimedAt: new Date(now),
      leaseUntil: new Date(now + this.leaseMs),
      claimId
    })
    return { acquired: true, claimId }
  }

  async markExecuted (tenantId: string, key: string, claimId: string): Promise<void> {
    const row = this.rows.get(this.scopedKey(tenantId, key))
    if (row == null || !this.leaseActive(row, Date.now()) || row.claimId !== claimId) {
      return
    }
    row.status = 'executed'
    row.executedAt = new Date()
    row.leaseUntil = undefined
    row.error = undefined
  }

  async markFailed (tenantId: string, key: string, claimId: string, error: string): Promise<void> {
    const row = this.rows.get(this.scopedKey(tenantId, key))
    if (row == null || !this.leaseActive(row, Date.now()) || row.claimId !== claimId) {
      return
    }
    row.status = row.attempts >= this.maxAttempts ? 'failed' : 'pending'
    row.error = error.slice(0, 500)
    row.leaseUntil = undefined
    row.claimedAt = undefined
    row.claimId = undefined
  }

  async release (tenantId: string, key: string, claimId: string): Promise<void> {
    const row = this.rows.get(this.scopedKey(tenantId, key))
    if (row == null || !this.leaseActive(row, Date.now()) || row.claimId !== claimId) {
      return
    }
    row.status = 'pending'
    row.leaseUntil = undefined
    row.claimedAt = undefined
    row.claimId = undefined
    row.error = undefined
  }

  clear (): void {
    this.rows.clear()
  }
}

export const actionIdempotencyStore: ActionIdempotencyStore =
  process.env.NODE_ENV === 'test'
    ? new InMemoryActionIdempotencyStore()
    : new MongoActionIdempotencyStore()
