/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import mongoose, { Schema, type Model } from 'mongoose'

export type ActionRecordStatus = 'pending' | 'processing' | 'executed' | 'failed'

/**
 * A single automation action claim. The document _id is the deterministic
 * action key (`actionType:tenantId:eventId:ruleId`) so the same logical action
 * always maps to exactly one record. Only a caller that atomically transitions
 * the record into `processing` (and holds the lease) may execute the external
 * side effect.
 */
export interface ActionRecordDoc {
  _id: string
  tenantId: string
  actionType?: string
  ruleId?: string
  eventId?: string
  botId?: string
  roomId?: string
  status: ActionRecordStatus
  attempts: number
  claimedAt?: Date | null
  leaseUntil?: Date | null
  executedAt?: Date | null
  error?: string | null
  createdAt: Date
  updatedAt: Date
}

const actionRecordSchema = new Schema<ActionRecordDoc>(
  {
    _id: { type: String, required: true },
    tenantId: { type: String, required: true, index: true },
    actionType: { type: String },
    ruleId: { type: String },
    eventId: { type: String },
    botId: { type: String },
    roomId: { type: String },
    status: { type: String, enum: ['pending', 'processing', 'executed', 'failed'], required: true },
    attempts: { type: Number, default: 0 },
    claimedAt: { type: Date, default: null },
    leaseUntil: { type: Date, default: null },
    executedAt: { type: Date, default: null },
    error: { type: String, default: null }
  },
  { timestamps: true }
)

export const ActionRecordModel: Model<ActionRecordDoc> = mongoose.model<ActionRecordDoc>(
  'ActionRecord',
  actionRecordSchema
)
