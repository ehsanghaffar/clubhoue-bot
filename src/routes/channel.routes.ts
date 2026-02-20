import { Router, Request, Response } from 'express';
import { clubService } from '../services/club-api.service';
import { constants } from '../config';

const pomodoroDuration = 45 * 60;
const breakDuration = 15 * 60;

let counter = 0;

type TimerCallback = (channel: string, emoji: string) => Promise<void>;

const startTimer = async (
  channel: string,
  emoji: string,
  duration: number,
  nextTimer?: TimerCallback
): Promise<void> => {
  setInterval(async () => {
    try {
      counter++;

      if (counter === duration) {
        if (nextTimer) {
          await nextTimer(channel, emoji);
        }

        await clubService.getChannelMessages({ channel });

        counter = 0;
      }
    } catch (error) {
      console.error('Timer error:', error);
      counter = 0;
    }
  }, constants.TIME.SECOND);
};

const startPomodoroTimer = (channel: string, emoji: string): Promise<void> =>
  startTimer(channel, emoji, pomodoroDuration, startBreakTimer);

const startBreakTimer = (channel: string, emoji: string): Promise<void> =>
  startTimer(channel, emoji, breakDuration, startPomodoroTimer);

const startBaseTimer = (channel: string, emoji: string): void => {
  setInterval(() => {
    const date = new Date();
    if (date.getMinutes() === 0) {
      startPomodoroTimer(channel, emoji);
    }
  }, constants.TIME.HOUR);
};

const router = Router();

router.post('/start-timer', (req: Request, res: Response) => {
  const { channel, emoji } = req.body as { channel: string; emoji: string };
  startBaseTimer(channel, emoji);
  res.sendStatus(200);
});

export default router;
