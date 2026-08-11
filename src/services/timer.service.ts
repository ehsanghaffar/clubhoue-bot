/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { clubService } from '../platforms/clubhouse/index.js'
import { constants } from '../config/index.js'
import logger from '../utils/logger.js'

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
  private baseTimerInterval: NodeJS.Timeout | null = null

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

    const durationMs = duration * 1000
    const startedAt = Date.now()

    const tick = async (): Promise<void> => {
      try {
        if (Date.now() - startedAt < durationMs) {
          return
        }

        clearInterval(interval)
        this.activeTimer = null

        if (nextTimer != null) {
          await nextTimer(channel, emoji)
        }

        await clubService.getChannelMessages({ channel })
      } catch (error) {
        logger.error('Timer error:', { error })
        clearInterval(interval)
        this.activeTimer = null
      }
    }

    const interval = setInterval(() => {
      void tick()
    }, constants.TIME.SECOND)

    this.activeTimer = interval
  }

  private readonly startPomodoroTimer = async (channel: string, emoji: string): Promise<void> => { await this.startTimer(channel, emoji, this.config.pomodoroDuration, this.startBreakTimer) }

  private readonly startBreakTimer = async (channel: string, emoji: string): Promise<void> => { await this.startTimer(channel, emoji, this.config.breakDuration, this.startPomodoroTimer) }

  /**
   * Starts a pomodoro cycle at the top of each hour.
   *
   * Checks every minute (rather than once per hour) so a cycle is started
   * reliably regardless of when the server started, and skips starting a new
   * cycle while one is already running to avoid overlapping timers.
   *
   * Calling this more than once replaces the previous hourly check loop instead
   * of leaking additional intervals, so timers never multiply across repeated
   * calls or across channels.
   */
  public startBaseTimer = (channel: string, emoji: string): void => {
    if (!channel || !emoji) {
      logger.warn('TimerService.startBaseTimer called without channel or emoji', { channel, emoji })
      return
    }

    this.stop()

    const check = (): void => {
      const date = new Date()
      if (date.getMinutes() === 0 && (this.activeTimer == null)) {
        void this.startPomodoroTimer(channel, emoji)
      }
    }

    check()
    this.baseTimerInterval = setInterval(check, constants.TIME.MINUTE)
    logger.info('Base timer loop started', { channel, emoji })
  }

  /**
   * Stops the hourly check loop and any currently running pomodoro/break timer.
   * Idempotent — safe to call multiple times and on shutdown.
   */
  public stop = (): void => {
    if (this.baseTimerInterval != null) {
      clearInterval(this.baseTimerInterval)
      this.baseTimerInterval = null
    }
    if (this.activeTimer != null) {
      clearInterval(this.activeTimer)
      this.activeTimer = null
    }
  }

  public isRunning = (): boolean => this.baseTimerInterval != null || this.activeTimer != null
}

export const timerService = new TimerService()
