/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type { Tenant, TenantCreateInput, TenantUpdateInput } from './tenant.types.js'
import type { TenantRepository } from './tenant.repository.js'
import { tenantRepository } from './tenant.repository.js'

export class TenantService {
  constructor (private readonly repo: TenantRepository) {}

  async createTenant (input: TenantCreateInput): Promise<Tenant> {
    return await this.repo.create(input)
  }

  async findById (id: string): Promise<Tenant | null> {
    return await this.repo.findById(id)
  }

  async findByApiKey (apiKey: string): Promise<Tenant | null> {
    return await this.repo.findByApiKey(apiKey)
  }

  async updateTenant (id: string, patch: TenantUpdateInput): Promise<Tenant | null> {
    return await this.repo.update(id, patch)
  }

  /**
   * Bootstraps a default tenant from the `API_KEY` environment variable so
   * the platform is usable out of the box. Idempotent: if a tenant already
   * owns the configured key it is left untouched.
   */
  async ensureDefaultTenant (): Promise<Tenant | null> {
    const apiKey = process.env.API_KEY
    if (apiKey == null || apiKey === '') {
      return null
    }

    const existing = await this.repo.findByApiKey(apiKey)
    if (existing != null) {
      return existing
    }

    return await this.repo.create({
      name: 'Default',
      apiKeys: [apiKey]
    })
  }
}

export const tenantService = new TenantService(tenantRepository)
