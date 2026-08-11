/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import Joi from 'joi'

/**
 * Credential creation schema. Only the platform auth token is required; the
 * device id and external account metadata are optional but strictly typed.
 * The token is encrypted at rest and is never returned by the API.
 */
export const createCredentialSchema = Joi.object({
  token: Joi.string().min(1).required(),
  deviceId: Joi.string().allow('').optional(),
  externalAccountId: Joi.string().allow('').optional(),
  externalAccountName: Joi.string().allow('').optional()
}).min(1)
