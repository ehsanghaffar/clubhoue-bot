/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type { BotCredential, CredentialStatus } from './credential.types.js'
import type { Platform } from '../types.js'
import { BotCredentialModel, toBotCredential } from '../../models/botCredential.js'

export interface CredentialCreateInput {
  tenantId: string
  botId: string
  platform: Platform
  encryptedToken: string
  externalAccountId?: string
  externalAccountName?: string
}

export interface CredentialUpdateInput {
  status?: CredentialStatus
  externalAccountId?: string
  externalAccountName?: string
}

export interface CredentialRepository {
  create: (input: CredentialCreateInput) => Promise<BotCredential>
  findById: (id: string) => Promise<BotCredential | null>
  findByIdAndTenant: (id: string, tenantId: string) => Promise<BotCredential | null>
  findActiveByBot: (botId: string) => Promise<BotCredential | null>
  findByBot: (botId: string) => Promise<BotCredential[]>
  findByTenant: (tenantId: string) => Promise<BotCredential[]>
  update: (tenantId: string, id: string, patch: CredentialUpdateInput) => Promise<BotCredential | null>
  delete: (tenantId: string, id: string) => Promise<void>
}

export class MongoCredentialRepository implements CredentialRepository {
  async create (input: CredentialCreateInput): Promise<BotCredential> {
    const doc = await BotCredentialModel.create(input)
    return toBotCredential(doc)
  }

  async findById (id: string): Promise<BotCredential | null> {
    const doc = await BotCredentialModel.findById(id).lean()
    return doc == null ? null : toBotCredential(doc)
  }

  async findByIdAndTenant (id: string, tenantId: string): Promise<BotCredential | null> {
    const doc = await BotCredentialModel.findOne({ _id: id, tenantId }).lean()
    return doc == null ? null : toBotCredential(doc)
  }

  async findActiveByBot (botId: string): Promise<BotCredential | null> {
    const doc = await BotCredentialModel.findOne({ botId, status: 'active' })
      .sort({ createdAt: -1 })
      .lean()
    return doc == null ? null : toBotCredential(doc)
  }

  async findByBot (botId: string): Promise<BotCredential[]> {
    const docs = await BotCredentialModel.find({ botId }).sort({ createdAt: -1 }).lean()
    return docs.map(toBotCredential)
  }

  async findByTenant (tenantId: string): Promise<BotCredential[]> {
    const docs = await BotCredentialModel.find({ tenantId }).sort({ createdAt: -1 }).lean()
    return docs.map(toBotCredential)
  }

  async update (tenantId: string, id: string, patch: CredentialUpdateInput): Promise<BotCredential | null> {
    const doc = await BotCredentialModel.findOneAndUpdate(
      { _id: id, tenantId },
      patch,
      { new: true }
    ).lean()
    return doc == null ? null : toBotCredential(doc)
  }

  async delete (tenantId: string, id: string): Promise<void> {
    await BotCredentialModel.deleteOne({ _id: id, tenantId })
  }
}

export const credentialRepository: CredentialRepository = new MongoCredentialRepository()
