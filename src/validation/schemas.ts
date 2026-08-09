/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import Joi from 'joi'

const channel = Joi.string().min(1).required()

export const joinRoomSchema = Joi.object({
  channel,
  source: Joi.string().optional(),
  isExplore: Joi.boolean().optional(),
  rank: Joi.number().optional()
})

export const acceptSpeakerInviteSchema = Joi.object({
  channel
})

export const getRoomUsersSchema = Joi.object({
  channel,
  username: Joi.string().min(1).required()
})

export const leaveRoomSchema = Joi.object({
  channel
})

export const getChannelMessagesSchema = Joi.object({
  channel,
  order: Joi.number().integer().optional()
})

export const sendChannelMessageSchema = Joi.object({
  channel,
  message: Joi.string().min(1).required()
})

export const getCurrentChannelSchema = Joi.object({
  channel
})

export const emojiReactionSchema = Joi.object({
  channel,
  emoji: Joi.string().min(1).required()
})

export const startChatbotSchema = Joi.object({
  channel
})

export const startTimerSchema = Joi.object({
  channel,
  emoji: Joi.string().min(1).required()
})

export const getNotificationsSchema = Joi.object({
  size: Joi.number().integer().min(1).optional(),
  page: Joi.number().integer().min(1).optional()
})

export const changeProfileSchema = Joi.object({
  token: Joi.string().allow('').optional()
})

export const acceptInviteSchema = Joi.object({
  username: Joi.string().min(1).required(),
  channel
})

export const getUserSchema = Joi.object({
  user_id: Joi.alternatives().try(Joi.string().min(1), Joi.number().integer()).required()
})

export const searchUsersSchema = Joi.object({
  query: Joi.string().optional(),
  onlyCoFollows: Joi.boolean().optional(),
  onlyFollowers: Joi.boolean().optional(),
  onlyFollowing: Joi.boolean().optional()
})
