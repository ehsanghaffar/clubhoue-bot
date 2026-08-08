/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { clubService } from './club-api.service'
import { constants } from '../config'
import logger from '../utils/logger'

type TimerCallback = (channel: string, emoji: string) => Promise<void>

export interface TimerConfig {
  pomodoroDuration?: number
  breakDuration?: number
  hourDuration?: number
}

const DEFAULT_CONFIG: Required<TimerConfig> = {
  pomodoroDuration: 45 * 60, // 45 minutes in seconds
  breakDuration: 15 * 60, // 15 minutes in seconds
  hourDuration: 60 * 60 // 1 hour in seconds
}

export class TimerService {
  private readonly config: Required<TimerConfig>
  private activeTimer: NodeJS.Timeout | null = null

  constructor (config: TimerConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Runs a countdown that fires every second.
   *
   * Each invocation gets its own interval and local counter so that
   * transitioning from a pomodoro to a break (and back) does not leak
   * accumulating intervals or share a single counter across timers.
   */
  private readonly startTimer = async (
    channel: string,
    emoji: string,
    duration: number,
    nextTimer?: TimerCallback
  ): Promise<void> => {
    if (this.activeTimer != null) {
      clearInterval(this.activeTimer)
    }

    let counter = 0

    const interval = setInterval(async () => {
      try {
        counter++

        if (counter >= duration) {
          clearInterval(interval)
          this.activeTimer = null

          if (nextTimer != null) {
            await nextTimer(channel, emoji)
          }

          await clubService.getChannelMessages({ channel })
        }
      } catch (error) {
        logger.error('Timer error:', { error })
        clearInterval(interval)
        this.activeTimer = null
      }
    }, constants.TIME.SECOND)

    this.activeTimer = interval
  }

  private readonly startPomodoroTimer = async (channel: string, emoji: string): Promise<void> =>
    await this.startTimer(channel, emoji, this.config.pomodoroDuration, this.startBreakTimer)

  private readonly startBreakTimer = async (channel: string, emoji: string): Promise<void> =>
    await this.startTimer(channel, emoji, this.config.breakDuration, this.startPomodoroTimer)

  /**
   * Starts a pomodoro cycle at the top of each hour.
   *
   * Checks every minute (rather than once per hour) so a cycle is started
   * reliably regardless of when the server started, and skips starting a new
   * cycle while one is already running to avoid overlapping timers.
   */
  public startBaseTimer = (channel: string, emoji: string): void => {
    const check = (): void => {
      const date = new Date()
      if (date.getMinutes() === 0 && (this.activeTimer == null)) {
        this.startPomodoroTimer(channel, emoji)
      }
    }

    check()
    setInterval(check, constants.TIME.MINUTE)
  }
}

export const timerService = new TimerService()
