/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import mongoose, { Schema, type Model } from 'mongoose'
import type { Platform } from '../core/types.js'
import type { CommunityEventType } from '../core/events/event.types.js'

export type CommunityEventStatus = 'pending' | 'processing' | 'processed' | 'failed'

export interface CommunityEventRecord {
  _id: string
  tenantId: string
  botId: string
  roomId: string
  platform: Platform
  type: CommunityEventType
  occurredAt: Date
  payload: unknown
  status: CommunityEventStatus
  attempts: number
  claimId?: string
  error?: string
  processedAt?: Date
  expiresAt?: Date
  createdAt: Date
  updatedAt: Date
}

const communityEventSchema = new Schema<CommunityEventRecord>(
  {
    _id: { type: String },
    tenantId: { type: String, required: true, index: true },
    botId: { type: String, required: true, index: true },
    roomId: { type: String, required: true, index: true },
    platform: { type: String, enum: ['clubhouse'], default: 'clubhouse' },
    type: { type: String, required: true },
    occurredAt: { type: Date, required: true },
    payload: { type: Schema.Types.Mixed },
    status: {
      type: String,
      enum: ['pending', 'processing', 'processed', 'failed'],
      default: 'pending',
      index: true
    },
    attempts: { type: Number, default: 0 },
    claimId: { type: String },
    error: { type: String },
    processedAt: { type: Date },
    // Retention: processed events expire after the TTL. Pending/processing/
    // failed events are never TTL-deleted so recovery + retry always see them.
    expiresAt: { type: Date, index: { expireAfterSeconds: 0 } }
  },
  { timestamps: true }
)

communityEventSchema.index({ tenantId: 1, status: 1, createdAt: 1 })

export const CommunityEventModel: Model<CommunityEventRecord> =
  mongoose.model<CommunityEventRecord>('CommunityEvent', communityEventSchema)

export const toCommunityEventRecord = (doc: CommunityEventRecord): CommunityEventRecord => ({
  _id: doc._id,
  tenantId: doc.tenantId,
  botId: doc.botId,
  roomId: doc.roomId,
  platform: doc.platform,
  type: doc.type,
  occurredAt: doc.occurredAt,
  payload: doc.payload,
  status: doc.status,
  attempts: doc.attempts,
  error: doc.error,
  processedAt: doc.processedAt,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt
})
