/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import Joi from 'joi'

/** Body for POST /v1/bots/:botId/users/search (legacy search_users). */
export const searchUsersSchema = Joi.object({
  query: Joi.string().min(1).max(200).required()
})
