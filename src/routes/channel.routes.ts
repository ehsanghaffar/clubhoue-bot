import { Router, Request, Response } from 'express';
import { timerService } from '../services/timer.service';

const router = Router();

router.post('/start-timer', (req: Request, res: Response) => {
  const { channel, emoji } = req.body as { channel: string; emoji: string };
  timerService.startBaseTimer(channel, emoji);
  res.sendStatus(200);
});

export default router;
