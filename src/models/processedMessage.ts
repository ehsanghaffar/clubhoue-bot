/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import mongoose, { Schema, type Model } from 'mongoose'
import { nanoid } from 'nanoid'

export interface ProcessedMessageDoc {
  _id: string
  key: string
  expiresAt: Date
  createdAt: Date
}

/**
 * Persistent message deduplication. Keys are shaped
 * `processed:{botId}:{roomId}:{messageId}` with a TTL so processed messages
 * are eventually re-processable without unbounded growth.
 */
const processedMessageSchema = new Schema<ProcessedMessageDoc>(
  {
    _id: { type: String, default: () => nanoid(12) },
    key: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true, expires: 0 }
  },
  { timestamps: true }
)

export const ProcessedMessageModel: Model<ProcessedMessageDoc> =
  mongoose.model<ProcessedMessageDoc>('ProcessedMessage', processedMessageSchema)
