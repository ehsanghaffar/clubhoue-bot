/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import mongoose, { Schema, type Model } from 'mongoose'
import { nanoid } from 'nanoid'
import type { UsageEvent, UsageType } from '../core/usage/usage.types.js'

export interface UsageEventDoc {
  _id: string
  tenantId: string
  botId: string
  roomId?: string
  type: UsageType
  timestamp: Date
  meta?: Record<string, unknown>
}

const usageEventSchema = new Schema<UsageEventDoc>(
  {
    _id: { type: String, default: () => nanoid(12) },
    tenantId: { type: String, required: true, index: true },
    botId: { type: String, required: true, index: true },
    roomId: { type: String },
    type: {
      type: String,
      enum: [
        'message_received',
        'message_sent',
        'ai_request',
        'ai_response',
        'speaker_invite',
        'room_join',
        'room_leave',
        'automation_triggered'
      ],
      required: true
    },
    timestamp: { type: Date, default: Date.now },
    meta: { type: Schema.Types.Mixed }
  },
  { timestamps: true }
)

usageEventSchema.index({ tenantId: 1, botId: 1, timestamp: -1 })

export const UsageEventModel: Model<UsageEventDoc> =
  mongoose.model<UsageEventDoc>('UsageEvent', usageEventSchema)

export const toUsageEvent = (doc: UsageEventDoc): UsageEvent => ({
  id: doc._id,
  tenantId: doc.tenantId,
  botId: doc.botId,
  roomId: doc.roomId,
  type: doc.type,
  timestamp: doc.timestamp,
  meta: doc.meta
})
