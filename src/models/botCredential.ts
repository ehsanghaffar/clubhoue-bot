/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import mongoose, { Schema, type Model } from 'mongoose'
import { nanoid } from 'nanoid'
import type { BotCredential, CredentialStatus } from '../core/credentials/credential.types.js'
import type { Platform } from '../core/types.js'

export interface BotCredentialDoc {
  _id: string
  tenantId: string
  botId: string
  platform: Platform
  encryptedToken: string
  externalAccountId?: string
  externalAccountName?: string
  status: CredentialStatus
  createdAt: Date
  updatedAt: Date
}

const botCredentialSchema = new Schema<BotCredentialDoc>(
  {
    _id: { type: String, default: () => nanoid(12) },
    tenantId: { type: String, required: true, index: true },
    botId: { type: String, required: true, index: true },
    platform: { type: String, enum: ['clubhouse'], default: 'clubhouse' },
    encryptedToken: { type: String, required: true },
    externalAccountId: { type: String },
    externalAccountName: { type: String },
    status: {
      type: String,
      enum: ['active', 'invalid', 'revoked'],
      default: 'active'
    }
  },
  { timestamps: true }
)

export const BotCredentialModel: Model<BotCredentialDoc> =
  mongoose.model<BotCredentialDoc>('BotCredential', botCredentialSchema)

export const toBotCredential = (doc: BotCredentialDoc): BotCredential => ({
  id: doc._id,
  tenantId: doc.tenantId,
  botId: doc.botId,
  platform: doc.platform,
  encryptedToken: doc.encryptedToken,
  externalAccountId: doc.externalAccountId,
  externalAccountName: doc.externalAccountName,
  status: doc.status,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt
})
