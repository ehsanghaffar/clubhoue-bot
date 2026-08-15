/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type { RequestHandler } from 'express'
import type { TenantService } from '../../core/tenants/tenant.service.js'
import { tenantService as defaultTenantService } from '../../core/tenants/tenant.service.js'
import { AppError, ErrorTypes } from '../../utils/errors.js'

/**
 * Authenticates the caller via the `x-api-key` header and resolves the owning
 * tenant. Suspended tenants are rejected. The resolved tenant is attached to
 * the request so downstream authorization/controllers stay tenant-scoped.
 */
export const authentication = (
  tenantSvc: TenantService = defaultTenantService
): RequestHandler => {
  return async (req, _res, next): Promise<void> => {
    try {
      const apiKey = req.header('x-api-key')
      if (apiKey == null || apiKey === '') {
        next(new AppError(ErrorTypes.UNAUTHORIZED, 401, 'Missing API key'))
        return
      }

      const tenant = await tenantSvc.findByApiKey(apiKey)
      if (tenant == null || tenant.status !== 'active') {
        next(new AppError(ErrorTypes.UNAUTHORIZED, 401, 'Invalid API key'))
        return
      }

      req.tenant = tenant
      req.apiKey = apiKey
      next()
    } catch (err: unknown) {
      next(new AppError(ErrorTypes.INTERNAL, 500, 'Authentication failed'))
    }
  }
}

export const requireAuth: RequestHandler = authentication()
