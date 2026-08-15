/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type { RequestHandler } from 'express'
import { AppError, ErrorTypes } from '../../utils/errors.js'

/**
 * Defense-in-depth guard: every v1 controller requires an attached tenant.
 * Mounted after `authentication` to guarantee tenant context is present.
 */
export const tenantContext: RequestHandler = (req, _res, next): void => {
  if (req.tenant == null || req.tenant.id === '') {
    next(new AppError(ErrorTypes.UNAUTHORIZED, 401, 'Tenant context missing'))
    return
  }
  next()
}
