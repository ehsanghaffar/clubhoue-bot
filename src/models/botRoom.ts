/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import mongoose, { Schema, type Model } from 'mongoose'
import { nanoid } from 'nanoid'
import type { BotRoom, BotRoomSettings, BotRoomStatus } from '../core/rooms/room.types.js'
import type { Platform } from '../core/types.js'

export interface BotRoomDoc {
  _id: string
  tenantId: string
  botId: string
  platform: Platform
  externalRoomId: string
  status: BotRoomStatus
  settings: BotRoomSettings
  joinedAt?: Date
  lastSeenAt?: Date
  createdAt: Date
  updatedAt: Date
}

const roomSettingsSchema = new Schema<BotRoomSettings>(
  {
    welcomeEnabled: { type: Boolean, default: true },
    aiEnabled: { type: Boolean, default: true },
    autoInviteEnabled: { type: Boolean, default: false },
    moderationEnabled: { type: Boolean, default: false },
    blockedUsers: { type: [String], default: undefined },
    blockedKeywords: { type: [String], default: undefined },
    messageRateLimit: {
      type: { max: Number, windowSeconds: Number },
      default: undefined,
      _id: false
    }
  },
  { _id: false }
)

const botRoomSchema = new Schema<BotRoomDoc>(
  {
    _id: { type: String, default: () => nanoid(12) },
    tenantId: { type: String, required: true, index: true },
    botId: { type: String, required: true, index: true },
    platform: { type: String, enum: ['clubhouse'], default: 'clubhouse' },
    externalRoomId: { type: String, required: true },
    status: {
      type: String,
      enum: ['configured', 'joining', 'active', 'leaving', 'inactive', 'error'],
      default: 'configured'
    },
    settings: { type: roomSettingsSchema, default: () => ({}) },
    joinedAt: { type: Date },
    lastSeenAt: { type: Date }
  },
  { timestamps: true }
)

botRoomSchema.index({ botId: 1, externalRoomId: 1 }, { unique: true })

export const BotRoomModel: Model<BotRoomDoc> = mongoose.model<BotRoomDoc>(
  'BotRoom',
  botRoomSchema
)

export const toBotRoom = (doc: BotRoomDoc): BotRoom => ({
  id: doc._id,
  tenantId: doc.tenantId,
  botId: doc.botId,
  platform: doc.platform,
  externalRoomId: doc.externalRoomId,
  status: doc.status,
  settings: doc.settings,
  joinedAt: doc.joinedAt,
  lastSeenAt: doc.lastSeenAt,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt
})
