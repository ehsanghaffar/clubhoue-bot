/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type { Tenant, TenantCreateInput, TenantStatus } from './tenant.types.js'
import { TenantModel, toTenant } from '../../models/tenant.js'

export interface TenantUpdateInput {
  name?: string
  status?: TenantStatus
  apiKeys?: string[]
}

export interface TenantRepository {
  create: (input: TenantCreateInput) => Promise<Tenant>
  findById: (id: string) => Promise<Tenant | null>
  findByApiKey: (apiKey: string) => Promise<Tenant | null>
  update: (id: string, patch: TenantUpdateInput) => Promise<Tenant | null>
}

export class MongoTenantRepository implements TenantRepository {
  async create (input: TenantCreateInput): Promise<Tenant> {
    const doc = await TenantModel.create({
      name: input.name,
      apiKeys: input.apiKeys ?? []
    })
    return toTenant(doc)
  }

  async findById (id: string): Promise<Tenant | null> {
    const doc = await TenantModel.findById(id).lean()
    return doc == null ? null : toTenant(doc)
  }

  async findByApiKey (apiKey: string): Promise<Tenant | null> {
    const doc = await TenantModel.findOne({ apiKeys: apiKey }).lean()
    return doc == null ? null : toTenant(doc)
  }

  async update (id: string, patch: TenantUpdateInput): Promise<Tenant | null> {
    const doc = await TenantModel.findByIdAndUpdate(id, patch, { new: true }).lean()
    return doc == null ? null : toTenant(doc)
  }
}

export const tenantRepository: TenantRepository = new MongoTenantRepository()
