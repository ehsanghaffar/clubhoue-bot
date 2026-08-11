/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import mongoose, { Schema, type Model } from 'mongoose'
import { nanoid } from 'nanoid'

export interface RoomMemberDoc {
  _id: string
  roomId: string
  userId: string
  displayName?: string
  firstSeenAt: Date
}

/**
 * Tracks users seen in a room so the bot can emit `user.joined` events (used
 * by the welcome automation) without depending on a join webhook.
 */
const roomMemberSchema = new Schema<RoomMemberDoc>(
  {
    _id: { type: String, default: () => nanoid(12) },
    roomId: { type: String, required: true, index: true },
    userId: { type: String, required: true },
    displayName: { type: String },
    firstSeenAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
)

roomMemberSchema.index({ roomId: 1, userId: 1 }, { unique: true })

export const RoomMemberModel: Model<RoomMemberDoc> =
  mongoose.model<RoomMemberDoc>('RoomMember', roomMemberSchema)
