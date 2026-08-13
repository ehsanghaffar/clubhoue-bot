/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { ActionRecordModel } from '../../models/actionRecord.js'

export type ActionType = 'ai_response' | 'welcome' | 'speaker_invite'

export interface ActionIdempotencyStore {
  /**
   * Atomically claims an action key. Returns true when this caller should
   * execute the side effect; false when it was already executed or claimed.
   */
  claim: (tenantId: string, key: string) => Promise<boolean>
  /** Marks a claimed action as successfully executed. */
  markExecuted: (tenantId: string, key: string) => Promise<void>
  /** Releases a pending claim without marking executed (retryable failure). */
  release: (tenantId: string, key: string) => Promise<void>
}

export const buildActionKey = (
  eventId: string,
  ruleId: string,
  actionType: ActionType
): string => `${actionType}:${eventId}:${ruleId}`

export class MongoActionIdempotencyStore implements ActionIdempotencyStore {
  async claim (tenantId: string, key: string): Promise<boolean> {
    try {
      await ActionRecordModel.updateOne(
        { _id: key, tenantId },
        { $setOnInsert: { _id: key, tenantId, status: 'pending' } },
        { upsert: true }
      )
      const doc = await ActionRecordModel.findOne({ _id: key, tenantId }).lean()
      return doc?.status === 'pending'
    } catch (err: unknown) {
      if ((err as { code?: number }).code === 11000) {
        const doc = await ActionRecordModel.findOne({ _id: key, tenantId }).lean()
        return doc?.status === 'pending'
      }
      throw err
    }
  }

  async markExecuted (tenantId: string, key: string): Promise<void> {
    await ActionRecordModel.updateOne(
      { _id: key, tenantId },
      { $set: { status: 'executed' } },
      { upsert: true }
    )
  }

  async release (tenantId: string, key: string): Promise<void> {
    await ActionRecordModel.deleteOne({ _id: key, tenantId, status: 'pending' })
  }
}

export class InMemoryActionIdempotencyStore implements ActionIdempotencyStore {
  private readonly rows = new Map<string, 'pending' | 'executed'>()

  private scopedKey (tenantId: string, key: string): string {
    return `${tenantId}:${key}`
  }

  async claim (tenantId: string, key: string): Promise<boolean> {
    const scoped = this.scopedKey(tenantId, key)
    const existing = this.rows.get(scoped)
    if (existing === 'executed') {
      return false
    }
    if (existing === 'pending') {
      return false
    }
    this.rows.set(scoped, 'pending')
    return true
  }

  async markExecuted (tenantId: string, key: string): Promise<void> {
    this.rows.set(this.scopedKey(tenantId, key), 'executed')
  }

  async release (tenantId: string, key: string): Promise<void> {
    const scoped = this.scopedKey(tenantId, key)
    if (this.rows.get(scoped) === 'pending') {
      this.rows.delete(scoped)
    }
  }

  clear (): void {
    this.rows.clear()
  }
}

export const actionIdempotencyStore: ActionIdempotencyStore =
  process.env.NODE_ENV === 'test'
    ? new InMemoryActionIdempotencyStore()
    : new MongoActionIdempotencyStore()
