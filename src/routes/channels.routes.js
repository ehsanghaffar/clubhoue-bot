/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
const express = require("express");
const router = express.Router();
const channelController = require('../controllers/channel.controller')
const welcomeController = require('../controllers/welcomeChannel.controller')
const { createInternalError } = require('../utils/errors')

/**
 * @swagger
 * /channels/join_room:
 *   post:
 *     summary: Join a room/channel
 *     tags: [Channels]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               channelId:
 *                 type: string
 *                 description: ID of the channel to join
 *             example:
 *               channel: "12345"
 *     responses:
 *       200:
 *         description: Successfully joined the room
 *       500:
 *         description: Internal server error
 */
router.post('/join_room', channelController.joinRoom)

/**
 * @swagger
 * /channels/accept_invite:
 *   post:
 *     summary: Accept an invitation to join a channel
 *     tags: [Channels]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               inviteId:
 *                 type: string
 *                 description: ID of the invitation
 *             example:
 *               inviteId: "invite123"
 *     responses:
 *       200:
 *         description: Invitation accepted successfully
 *       500:
 *         description: Internal server error
 */
router.post('/accept_invite', channelController.acceptInvite);

/**
 * @swagger
 * /channels/get_room_users:
 *   post:
 *     summary: Get information about users in a room/channel
 *     tags: [Channels]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               channel:
 *                 type: string
 *                 description: Channel ID to get users for
 *                 example: "channel123"
 *     responses:
 *       200:
 *         description: Channel user information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       500:
 *         description: Internal server error
 */
router.post('/get_room_users', welcomeController.getChannelInfo);

/**
 * @swagger
 * /channels/leave:
 *   post:
 *     summary: Leave a room/channel
 *     tags: [Channels]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               channel:
 *                 type: string
 *                 description: Channel ID to leave
 *                 example: "channel123"
 *     responses:
 *       200:
 *         description: Successfully left the channel
 *       500:
 *         description: Internal server error
 */
router.post("/leave", channelController.leaveRoom);

/**
 * @swagger
 * /channels/channels:
 *   post:
 *     summary: Get channels feed
 *     tags: [Channels]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               offset:
 *                 type: integer
 *                 description: Pagination offset
 *                 example: 0
 *     responses:
 *       200:
 *         description: List of channels
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       500:
 *         description: Internal server error
 */
router.post('/channels', async (req, res, next) => {
  try {
    await channelController.getFeed(req, res);
  } catch (error) {
    next(createInternalError('Failed to get channels feed'));
  }
});

/**
 * @swagger
 * /channels/current-channel:
 *   post:
 *     summary: Get current channel information
 *     tags: [Channels]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               channel:
 *                 type: string
 *                 description: Channel ID
 *                 example: "channel123"
 *     responses:
 *       200:
 *         description: Current channel information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       500:
 *         description: Internal server error
 */
router.post('/current-channel', channelController.getCurrentChannel);

/**
 * @swagger
 * /channels/room-msgs:
 *   post:
 *     summary: Get messages from a room/channel
 *     tags: [Channels]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               channel:
 *                 type: string
 *                 description: Channel ID to get messages from
 *                 example: "channel123"
 *               order:
 *                 type: integer
 *                 description: Message order (0 for latest)
 *                 example: 0
 *     responses:
 *       200:
 *         description: List of channel messages
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       500:
 *         description: Internal server error
 */
router.post('/room-msgs', channelController.getChannelMsgs);

/**
 * @swagger
 * /channels/send-room-msg:
 *   post:
 *     summary: Send a message to a room/channel
 *     tags: [Channels]
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
 *                 description: Channel ID to send message to
 *                 example: "channel123"
 *               message:
 *                 type: string
 *                 description: Message content
 *                 example: "Hello everyone!"
 *     responses:
 *       200:
 *         description: Message sent successfully
 *       500:
 *         description: Internal server error
 */
router.post('/send-room-msg', channelController.sendMessageToRoom);

/**
 * @swagger
 * /channels/me:
 *   post:
 *     summary: Get current user profile information
 *     tags: [Channels]
 *     responses:
 *       200:
 *         description: Current user profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       500:
 *         description: Internal server error
 */
router.post('/me', channelController.myProfile)

module.exports = router;