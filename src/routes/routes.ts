import { Router } from 'express';
import profilesRoutes from './profiles.routes';
import usersRoutes from './users.routes';
import channelsRoutes from './channels.routes';
import chatbotRoutes from './chatbot.routes';
import channelRoutes from './channel.routes';

const router = Router();

router.use('/profiles', profilesRoutes);
router.use('/users', usersRoutes);
router.use('/channels', channelsRoutes);
router.use('/chatbot', chatbotRoutes);
router.use('/channel', channelRoutes);

export default router;
