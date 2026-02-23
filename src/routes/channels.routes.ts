import { Router, Request, Response, NextFunction } from 'express';
import * as channelController from '../controllers/channel.controller';
import * as welcomeController from '../controllers/welcomeChannel.controller';
import { createInternalError } from '../utils/errors';

/**
 * Channel management routes
 */
const router = Router();

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
router.post('/join_room', channelController.joinRoom);

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
router.post('/accept_invite', channelController.acceptInvite);

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
 *             properties:
 *               channel:
 *                 type: string
 *     responses:
 *       200:
 *         description: List of users in the room
 */
router.post('/get_room_users', welcomeController.getChannelInfo);

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
router.post('/leave', channelController.leaveRoom);

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
router.post('/channels', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await channelController.getFeed(req, res);
  } catch (error) {
    next(createInternalError('Failed to get channels feed'));
  }
});

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
router.post('/current-channel', channelController.getCurrentChannel);

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
router.post('/room-msgs', channelController.getChannelMsgs);

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
router.post('/send-room-msg', channelController.sendMessageToRoom);

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
router.post('/me', channelController.myProfile);

export default router;
