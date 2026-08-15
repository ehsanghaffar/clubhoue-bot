/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import Joi from 'joi'

/** Body for POST /v1/bots/:botId/rooms/:roomId/messages (legacy send-room-msg). */
export const sendMessageSchema = Joi.object({
  message: Joi.string().min(1).max(2000).required()
})
