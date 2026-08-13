/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import mongoose, { Schema, type Model } from 'mongoose'

export type ActionRecordStatus = 'pending' | 'executed'

export interface ActionRecordDoc {
  _id: string
  tenantId: string
  status: ActionRecordStatus
  createdAt: Date
  updatedAt: Date
}

const actionRecordSchema = new Schema<ActionRecordDoc>(
  {
    _id: { type: String, required: true },
    tenantId: { type: String, required: true, index: true },
    status: { type: String, enum: ['pending', 'executed'], required: true }
  },
  { timestamps: true }
)

export const ActionRecordModel: Model<ActionRecordDoc> = mongoose.model<ActionRecordDoc>(
  'ActionRecord',
  actionRecordSchema
)
