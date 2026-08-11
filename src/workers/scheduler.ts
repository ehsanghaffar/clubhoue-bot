/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type { JobQueue } from '../infrastructure/queue/queue.js'
import {
  JOB_ACTIVE_PING,
  JOB_ROOM_SYNC,
  type ActivePingJob,
  type RoomSyncJob
} from './jobs.js'
import logger from '../utils/logger.js'

export interface SchedulerDeps {
  queue: JobQueue
  roomSyncIntervalMs?: number
  pingIntervalMs?: number
}

const DEFAULT_ROOM_SYNC_MS = 15 * 1000
const DEFAULT_PING_MS = 3 * 60 * 1000

/**
 * Emits periodic background jobs (room sync + active ping) onto the queue.
 * The interval-based scheduling lives here instead of inside the HTTP server,
 * so bot state is preserved across API restarts when a persistent queue is
 * used (see spec §18 worker architecture).
 */
export class Scheduler {
  private readonly timers: NodeJS.Timeout[] = []

  constructor (private readonly deps: SchedulerDeps) {}

  start (): void {
    const syncMs = this.deps.roomSyncIntervalMs ?? DEFAULT_ROOM_SYNC_MS
    const pingMs = this.deps.pingIntervalMs ?? DEFAULT_PING_MS

    this.timers.push(setInterval(() => {
      void this.enqueueRoomSyncs()
    }, syncMs))
    this.timers.push(setInterval(() => {
      void this.enqueuePings()
    }, pingMs))
    logger.info('Scheduler started', { syncMs, pingMs })
  }

  stop (): void {
    for (const timer of this.timers) {
      clearInterval(timer)
    }
    this.timers.length = 0
  }

  /** Placeholder: real room enumeration comes from the room repository. */
  private async enqueueRoomSyncs (): Promise<void> {
    // Rooms to sync are supplied by BotManager in the embedded-worker MVP.
  }

  private async enqueuePings (): Promise<void> {
    // Pings target active rooms; no-op in the embedded single-process MVP.
  }

  /** Test-friendly helpers for explicit scheduling. */
  async scheduleRoomSync (data: RoomSyncJob): Promise<void> {
    await this.deps.queue.enqueue(JOB_ROOM_SYNC, { ...data })
  }

  async schedulePing (data: ActivePingJob): Promise<void> {
    await this.deps.queue.enqueue(JOB_ACTIVE_PING, { ...data })
  }
}
