/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { Router } from 'express'
import * as channelController from '../controllers/channel.controller.js'
import * as welcomeController from '../controllers/welcomeChannel.controller.js'
import { validateBody } from '../middlewares/validate.js'
import {
  joinRoomSchema,
  acceptSpeakerInviteSchema,
  getRoomUsersSchema,
  leaveRoomSchema,
  getChannelMessagesSchema,
  sendChannelMessageSchema,
  getCurrentChannelSchema
} from '../validation/schemas.js'

/**
 * Channel management routes
 */
const router: Router = Router()

/**
 * @openapi
 * /channels/join_room:
 *   post:
 *     summary: Join a channel/room
 *     tags:
 *       - Channels
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - channel
 *             properties:
 *               channel:
 *                 type: string
 *                 description: Channel ID to join
 *               source:
 *                 type: string
 *                 default: feed
 *     responses:
 *       200:
 *         description: Successfully joined channel
 *       500:
 *         description: Error joining channel
 */
router.post('/join_room', validateBody(joinRoomSchema), channelController.joinRoom)

/**
 * @openapi
 * /channels/accept_invite:
 *   post:
 *     summary: Accept a speaker invitation
 *     tags:
 *       - Channels
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - channel
 *             properties:
 *               channel:
 *                 type: string
 *     responses:
 *       200:
 *         description: Invitation accepted
 */
router.post('/accept_invite', validateBody(acceptSpeakerInviteSchema), channelController.acceptInvite)

/**
 * @openapi
 * /channels/get_room_users:
 *   post:
 *     summary: Get users in a room
 *     tags:
 *       - Channels
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - channel
 *               - username
 *             properties:
 *               channel:
 *                 type: string
 *               username:
 *                 type: string
 *     responses:
 *       200:
 *         description: List of users in the room
 */
router.post('/get_room_users', validateBody(getRoomUsersSchema), welcomeController.getChannelInfo)

/**
 * @openapi
 * /channels/leave:
 *   post:
 *     summary: Leave a channel
 *     tags:
 *       - Channels
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - channel
 *             properties:
 *               channel:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successfully left channel
 */
router.post('/leave', validateBody(leaveRoomSchema), channelController.leaveRoom)

/**
 * @openapi
 * /channels/channels:
 *   post:
 *     summary: Get channel feed
 *     tags:
 *       - Channels
 *     responses:
 *       200:
 *         description: List of active channels
 */
router.post('/channels', channelController.getFeed)

/**
 * @openapi
 * /channels/current-channel:
 *   post:
 *     summary: Get current active channel
 *     tags:
 *       - Channels
 *     responses:
 *       200:
 *         description: Current channel info
 */
router.post('/current-channel', validateBody(getCurrentChannelSchema), channelController.getCurrentChannel)

/**
 * @openapi
 * /channels/room-msgs:
 *   post:
 *     summary: Get room messages
 *     tags:
 *       - Channels
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - channel
 *             properties:
 *               channel:
 *                 type: string
 *               order:
 *                 type: number
 *                 default: -1
 *     responses:
 *       200:
 *         description: Room messages
 */
router.post('/room-msgs', validateBody(getChannelMessagesSchema), channelController.getChannelMsgs)

/**
 * @openapi
 * /channels/send-room-msg:
 *   post:
 *     summary: Send message to room
 *     tags:
 *       - Channels
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - channel
 *               - message
 *             properties:
 *               channel:
 *                 type: string
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Message sent
 */
router.post('/send-room-msg', validateBody(sendChannelMessageSchema), channelController.sendMessageToRoom)

/**
 * @openapi
 * /channels/me:
 *   post:
 *     summary: Get current user profile
 *     tags:
 *       - Channels
 *     responses:
 *       200:
 *         description: User profile information
 */
router.post('/me', channelController.myProfile)

export default router
