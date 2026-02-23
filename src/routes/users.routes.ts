import { Router, Request, Response } from 'express';
import { clubService } from '../services/club-api.service';
import { constants } from '../config';
import logger from '../utils/logger';

const router = Router();

router.post('/search_users', async (req: Request, res: Response) => {
  const query = req.body;
  try {
    const users = await clubService.searchUsers(query);
    res.send(users);
  } catch (error) {
    logger.error('Error searching users:', { error });
    res.status(constants.HTTP_STATUS.INTERNAL_SERVER_ERROR).send('Error...');
  }
});

export default router;
