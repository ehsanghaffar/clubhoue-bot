/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import mongoose, { Schema, type Model } from 'mongoose'
import { nanoid } from 'nanoid'
import type { Tenant, TenantStatus } from '../core/tenants/tenant.types.js'

export interface TenantDoc {
  _id: string
  name: string
  status: TenantStatus
  apiKeys: string[]
  createdAt: Date
  updatedAt: Date
}

const tenantSchema = new Schema<TenantDoc>(
  {
    _id: { type: String, default: () => nanoid(12) },
    name: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['active', 'suspended'],
      default: 'active'
    },
    apiKeys: { type: [String], default: [], index: true }
  },
  { timestamps: true }
)

export const TenantModel: Model<TenantDoc> = mongoose.model<TenantDoc>(
  'Tenant',
  tenantSchema
)

export const toTenant = (doc: TenantDoc): Tenant => ({
  id: doc._id,
  name: doc.name,
  status: doc.status,
  apiKeys: doc.apiKeys ?? [],
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt
})
