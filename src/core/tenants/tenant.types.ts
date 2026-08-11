/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */

export type TenantStatus = 'active' | 'suspended'

/**
 * A tenant owns bots, rooms, credentials and usage data. Everything
 * user-owned is scoped through a tenant.
 */
export interface Tenant {
  id: string
  name: string
  status: TenantStatus
  /** API keys authorized to act on behalf of this tenant. */
  apiKeys: string[]
  createdAt: Date
  updatedAt: Date
}

export interface TenantCreateInput {
  name: string
  apiKeys?: string[]
}

export interface TenantUpdateInput {
  name?: string
  status?: TenantStatus
  apiKeys?: string[]
}
