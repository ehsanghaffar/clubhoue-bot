import { Router, Request, Response, NextFunction } from 'express';
import * as channelController from '../controllers/channel.controller';
import * as welcomeController from '../controllers/welcomeChannel.controller';
import { createInternalError } from '../utils/errors';

const router = Router();

router.post('/join_room', channelController.joinRoom);

router.post('/accept_invite', channelController.acceptInvite);

router.post('/get_room_users', welcomeController.getChannelInfo);

router.post('/leave', channelController.leaveRoom);

router.post('/channels', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await channelController.getFeed(req, res);
  } catch (error) {
    next(createInternalError('Failed to get channels feed'));
  }
});

router.post('/current-channel', channelController.getCurrentChannel);

router.post('/room-msgs', channelController.getChannelMsgs);

router.post('/send-room-msg', channelController.sendMessageToRoom);

router.post('/me', channelController.myProfile);

export default router;
