/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { clubService } from './club-api.service';
import { constants } from '../config';
import logger from '../utils/logger';

type TimerCallback = (channel: string, emoji: string) => Promise<void>;

export interface TimerConfig {
  pomodoroDuration?: number;
  breakDuration?: number;
  hourDuration?: number;
}

const DEFAULT_CONFIG: Required<TimerConfig> = {
  pomodoroDuration: 45 * 60, // 45 minutes in seconds
  breakDuration: 15 * 60,    // 15 minutes in seconds
  hourDuration: 60 * 60,     // 1 hour in seconds
};

export class TimerService {
  private config: Required<TimerConfig>;
  private counter: number = 0;

  constructor(config: TimerConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  private startTimer = async (
    channel: string,
    emoji: string,
    duration: number,
    nextTimer?: TimerCallback
  ): Promise<void> => {
    setInterval(async () => {
      try {
        this.counter++;

        if (this.counter === duration) {
          if (nextTimer) {
            await nextTimer(channel, emoji);
          }

          await clubService.getChannelMessages({ channel });

          this.counter = 0;
        }
      } catch (error) {
        logger.error('Timer error:', { error });
        this.counter = 0;
      }
    }, constants.TIME.SECOND);
  };

  private startPomodoroTimer = (channel: string, emoji: string): Promise<void> =>
    this.startTimer(channel, emoji, this.config.pomodoroDuration, this.startBreakTimer);

  private startBreakTimer = (channel: string, emoji: string): Promise<void> =>
    this.startTimer(channel, emoji, this.config.breakDuration, this.startPomodoroTimer);

  public startBaseTimer = (channel: string, emoji: string): void => {
    setInterval(() => {
      const date = new Date();
      if (date.getMinutes() === 0) {
        this.startPomodoroTimer(channel, emoji);
      }
    }, this.config.hourDuration * 1000); // Convert to milliseconds
  };
}

export const timerService = new TimerService();
