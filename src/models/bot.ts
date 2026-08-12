/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import mongoose, { Schema, type Model } from 'mongoose'
import { nanoid } from 'nanoid'
import type { AiConfig, Bot, BotStatus } from '../core/bots/bot.types.js'
import type { Platform } from '../core/types.js'

export interface BotDoc {
  _id: string
  tenantId: string
  name: string
  platform: Platform
  status: BotStatus
  aiConfig: AiConfig
  personality?: string
  welcomeMessage?: string
  createdAt: Date
  updatedAt: Date
}

const aiConfigSchema = new Schema<AiConfig>(
  {
    enabled: { type: Boolean, default: true },
    model: { type: String, default: 'gpt-4o-mini' },
    temperature: { type: Number, default: 0.4 },
    maxOutputTokens: { type: Number, default: 150 },
    maxResponseLength: { type: Number, default: 280 },
    triggerMode: {
      type: String,
      enum: ['mention', 'prefix', 'keyword', 'question', 'manual'],
      default: 'mention'
    },
    triggerPrefix: { type: String, default: '#' },
    cooldownSeconds: { type: Number, default: 30 }
  },
  { _id: false }
)

const botSchema = new Schema<BotDoc>(
  {
    _id: { type: String, default: () => nanoid(12) },
    tenantId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    platform: { type: String, enum: ['clubhouse'], default: 'clubhouse' },
    status: {
      type: String,
      enum: ['created', 'starting', 'active', 'stopping', 'stopped', 'error'],
      default: 'created'
    },
    aiConfig: { type: aiConfigSchema, default: () => ({}) },
    personality: { type: String },
    welcomeMessage: { type: String }
  },
  { timestamps: true }
)

botSchema.index({ tenantId: 1, name: 1 }, { unique: true })

export const BotModel: Model<BotDoc> = mongoose.model<BotDoc>('Bot', botSchema)

export const toBot = (doc: BotDoc): Bot => ({
  id: doc._id,
  tenantId: doc.tenantId,
  name: doc.name,
  platform: doc.platform,
  status: doc.status,
  aiConfig: doc.aiConfig,
  personality: doc.personality,
  welcomeMessage: doc.welcomeMessage,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt
})
