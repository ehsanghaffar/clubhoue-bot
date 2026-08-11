/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import Joi from 'joi'

const messageRateLimitSchema = Joi.object({
  max: Joi.number().integer().min(1).max(1000),
  windowSeconds: Joi.number().integer().min(1).max(86400)
})

const roomSettingsSchema = Joi.object({
  welcomeEnabled: Joi.boolean(),
  aiEnabled: Joi.boolean(),
  autoInviteEnabled: Joi.boolean(),
  moderationEnabled: Joi.boolean(),
  blockedUsers: Joi.array().items(Joi.string().min(1).max(200)).max(1000),
  blockedKeywords: Joi.array().items(Joi.string().min(1).max(200)).max(1000),
  messageRateLimit: messageRateLimitSchema
})

export const createRoomSchema = Joi.object({
  externalRoomId: Joi.string().min(1).max(200).required(),
  settings: roomSettingsSchema.optional()
})
