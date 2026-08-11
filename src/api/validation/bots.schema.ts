/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import Joi from 'joi'

const aiConfigSchema = Joi.object({
  enabled: Joi.boolean(),
  model: Joi.string().min(1).max(200),
  temperature: Joi.number().min(0).max(2),
  maxOutputTokens: Joi.number().integer().min(1).max(8192),
  maxResponseLength: Joi.number().integer().min(1).max(10000),
  triggerMode: Joi.string().valid('mention', 'prefix', 'keyword', 'question', 'manual'),
  triggerPrefix: Joi.string().max(10).allow(''),
  cooldownSeconds: Joi.number().integer().min(0).max(86400)
})

export const createBotSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  platform: Joi.string().valid('clubhouse').required(),
  personality: Joi.string().max(2000).allow('', null).optional(),
  welcomeMessage: Joi.string().max(500).allow('', null).optional(),
  aiConfig: aiConfigSchema.optional()
})

export const updateBotSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional(),
  personality: Joi.string().max(2000).allow('', null).optional(),
  welcomeMessage: Joi.string().max(500).allow('', null).optional(),
  aiConfig: aiConfigSchema.optional()
}).min(1)
