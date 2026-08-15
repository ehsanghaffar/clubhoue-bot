/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type { Bot } from './bot.types.js'
import type { BotRepository } from './bot.repository.js'
import type { BotRoom } from '../rooms/room.types.js'
import type { RoomRepository } from '../rooms/room.repository.js'
import type { RoomService } from '../rooms/room.service.js'
import type { BotService } from './bot.service.js'
import type { CredentialService } from '../credentials/credential.service.js'
import type { CommunityPlatformAdapter } from '../../platforms/adapter.js'
import type { CommunityEvent } from '../events/event.types.js'
import type { RuleContext } from '../automation/automation.types.js'
import { createRuleContext } from '../automation/action-dispatcher.js'
import { ClubhouseApiError } from '../../platforms/clubhouse/errors.js'
import logger from '../../utils/logger.js'

export interface BotManagerDeps {
  bots: BotRepository
  rooms: RoomRepository
  roomService: RoomService
  botService: BotService
  credentials: CredentialService
}

export interface BotRuntimeScope {
  tenantId: string
  botId: string
}

export interface RoomRuntimeScope extends BotRuntimeScope {
  roomId: string
}

export interface InviteSpeakerScope extends RoomRuntimeScope {
  userId: string
}

interface RuntimeEntry {
  tenantId: string
  bot: Bot
  adapter: CommunityPlatformAdapter
  botUserId?: string
  externalAccountName?: string
}

interface RoomTimers {
  sync?: NodeJS.Timeout
  ping?: NodeJS.Timeout
}

interface PingResult {
  ok: boolean
  retryable: boolean
}

type StartupStatus = 'stopped' | 'starting' | 'active' | 'stopping' | 'error'

interface StartupEntry {
  status: StartupStatus
  promise?: Promise<void>
  /**
   * Lifecycle epoch. Every start/stop request for a bot bumps it; an in-flight
   * transition aborts at its next checkpoint when its generation is no longer
   * current, so a stop that wins the race is never undone by a late start.
   */
  generation: number
}

const DEFAULT_SYNC_INTERVAL_MS = parseInt(process.env.ROOM_SYNC_INTERVAL_MS ?? '15000', 10)

export const clampActivePingInterval = (value: string | number | undefined): number => {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 180000
  }
  return Math.min(Math.max(parsed, 120000), 300000)
}

const DEFAULT_ACTIVE_PING_INTERVAL_MS = clampActivePingInterval(process.env.ACTIVE_PING_INTERVAL_MS ?? '180000')

const parsePositiveInt = (value: string, fallback: number): number => {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

/** Retry budget for the immediate active ping fired right after a bot joins a room. */
export const JOIN_PING_RETRY_ATTEMPTS = parsePositiveInt(process.env.JOIN_PING_RETRY_ATTEMPTS ?? '3', 3)
export const JOIN_PING_RETRY_BASE_DELAY_MS = parsePositiveInt(process.env.JOIN_PING_RETRY_BASE_DELAY_MS ?? '1000', 1000)

const delay = async (ms: number): Promise<void> => { await new Promise((resolve) => setTimeout(resolve, ms)) }

/**
 * Owns the per-bot runtime: builds an adapter per active bot, starts/stops the
 * per-room sync and ping loops (scoped by botId:roomId), and resolves
 * automation rule contexts from the events those loops publish.
 */
export class BotManager {
  private readonly runtimes = new Map<string, RuntimeEntry>()
  private readonly roomTimers = new Map<string, RoomTimers>()
  private readonly startup = new Map<string, StartupEntry>()

  constructor (private readonly deps: BotManagerDeps) {}

  async startBot (scope: BotRuntimeScope): Promise<void> {
    const { tenantId, botId } = scope
    for (;;) {
      const existing = this.startup.get(botId)
      if ((existing?.status === 'starting' || existing?.status === 'stopping') && existing.promise != null) {
        await existing.promise
        continue
      }
      if (existing?.status === 'active' && this.runtimes.has(botId)) {
        return
      }
      const generation = (existing?.generation ?? 0) + 1
      const promise = this.doStartBot(tenantId, botId, generation)
      this.startup.set(botId, { status: 'starting', promise, generation })
      try {
        await promise
        // A stop/start/credential-failure requested while we were starting
        // supersedes this transition; its state wins and this start is a no-op.
        if (this.startup.get(botId)?.generation !== generation) {
          return
        }
        this.startup.set(botId, { status: 'active', generation })
        return
      } catch (error) {
        this.startup.set(botId, { status: 'error', generation })
        throw error
      }
    }
  }

  private async doStartBot (tenantId: string, botId: string, generation: number): Promise<void> {
    const bot = await this.deps.bots.findByIdAndTenant(botId, tenantId)
    if (bot == null) {
      throw new Error(`Bot not found: ${botId}`)
    }

    const credential = await this.deps.credentials.getActiveByBot(tenantId, botId)
    const adapter = await this.deps.botService.createAdapter(bot)
    const botUserId = credential?.externalAccountId ?? await this.deps.botService.getBotExternalUserId(tenantId, botId)

    // A lifecycle transition requested while we were loading supersedes this
    // start: never build a runtime for a bot whose stop has already won.
    if (!this.isCurrentGeneration(botId, generation)) {
      return
    }

    this.runtimes.set(botId, {
      tenantId,
      bot,
      adapter,
      botUserId,
      externalAccountName: credential?.externalAccountName
    })

    const rooms = await this.deps.rooms.findByBotAndTenant(botId, tenantId)
    for (const room of rooms) {
      if (!this.isCurrentGeneration(botId, generation)) {
        this.runtimes.delete(botId)
        return
      }
      if (room.status === 'inactive' || room.status === 'error') {
        continue
      }
      if (room.status !== 'active' && room.status !== 'joining') {
        try {
          await this.deps.roomService.update(tenantId, room.id, { status: 'joining' })
          await this.deps.roomService.join(room, adapter)
        } catch (error) {
          logger.error('Failed to join room', { tenantId, botId, roomId: room.id, externalRoomId: room.externalRoomId, error })
          await this.deps.roomService.update(tenantId, room.id, { status: 'error' })
          continue
        }
      }
      await this.ensureRoomRuntime(tenantId, botId, room, adapter, generation)
    }

    // A stop may have won while rooms were being prepared.
    if (!this.isCurrentGeneration(botId, generation)) {
      this.runtimes.delete(botId)
      return
    }

    await this.deps.bots.update(tenantId, botId, { status: 'active' })
    logger.info('Bot started', { tenantId, botId })
  }

  async stopBot (scope: BotRuntimeScope): Promise<void> {
    const { tenantId, botId } = scope
    const existing = this.startup.get(botId)
    const generation = (existing?.generation ?? 0) + 1
    const promise = this.doStopBot(tenantId, botId, generation)
    this.startup.set(botId, { status: 'stopping', promise, generation })
    await promise
  }

  /**
   * Tears down the bot runtime. Runs immediately (bumping the lifecycle
   * generation) so a stop requested while a start is in flight wins the race;
   * the in-flight start aborts at its next generation checkpoint.
   */
  private async doStopBot (tenantId: string, botId: string, generation: number): Promise<void> {
    this.clearBotTimers(botId)
    this.runtimes.delete(botId)
    await this.deps.bots.update(tenantId, botId, { status: 'stopped' })
    if (this.isCurrentGeneration(botId, generation)) {
      this.startup.set(botId, { status: 'stopped', generation })
    }
    logger.info('Bot stopped', { tenantId, botId })
  }

  private isCurrentGeneration (botId: string, generation: number): boolean {
    return this.startup.get(botId)?.generation === generation
  }

  /**
   * Resumes every active bot on process boot. The global findByStatus('active')
   * query is an intentional system-level bootstrap operation: no request path
   * reaches this and each bot is started under its own tenant scope.
   */
  async startAll (): Promise<void> {
    const active = await this.deps.bots.findByStatus('active')
    for (const bot of active) {
      try {
        await this.startBot({ tenantId: bot.tenantId, botId: bot.id })
      } catch (error) {
        logger.error('Failed to restart bot on boot', { botId: bot.id, tenantId: bot.tenantId, error })
      }
    }
    logger.info('Bot manager started', { activeCount: active.length })
  }

  resolveContext = async (event: CommunityEvent): Promise<RuleContext | null> => {
    const runtime = this.runtimes.get(event.botId)
    if (runtime == null || runtime.tenantId !== event.tenantId) {
      return null
    }
    const room = await this.deps.rooms.findByIdAndTenantAndBot(event.roomId, event.tenantId, event.botId)
    if (room == null) {
      return null
    }
    return createRuleContext({
      bot: runtime.bot,
      room,
      adapter: runtime.adapter,
      botUserId: runtime.botUserId,
      externalAccountName: runtime.externalAccountName
    })
  }

  stopAll (): void {
    for (const botId of [...this.runtimes.keys()]) {
      this.clearBotTimers(botId)
    }
    this.roomTimers.clear()
    this.runtimes.clear()
    for (const botId of this.startup.keys()) {
      this.startup.set(botId, { status: 'stopped', generation: 0 })
    }
  }

  async syncRoom (scope: RoomRuntimeScope): Promise<number> {
    const runtime = this.runtimes.get(scope.botId)
    if (runtime == null || runtime.tenantId !== scope.tenantId) {
      return 0
    }
    const room = await this.deps.rooms.findByIdAndTenantAndBot(scope.roomId, scope.tenantId, scope.botId)
    if (room == null || room.status !== 'active') {
      return 0
    }
    return await this.deps.roomService.syncRoom(room, runtime.adapter)
  }

  async pingRoom (scope: RoomRuntimeScope): Promise<void> {
    const runtime = this.runtimes.get(scope.botId)
    if (runtime == null || runtime.tenantId !== scope.tenantId) {
      return
    }
    const room = await this.deps.rooms.findByIdAndTenantAndBot(scope.roomId, scope.tenantId, scope.botId)
    if (room == null || room.status !== 'active') {
      return
    }
    if (runtime.adapter.ping == null) {
      return
    }
    await this.performPing(scope.tenantId, scope.botId, room, runtime.adapter)
  }

  async inviteSpeaker (scope: InviteSpeakerScope): Promise<void> {
    const runtime = this.runtimes.get(scope.botId)
    if (runtime == null || runtime.tenantId !== scope.tenantId) {
      return
    }
    const room = await this.deps.rooms.findByIdAndTenantAndBot(scope.roomId, scope.tenantId, scope.botId)
    if (room == null || room.status !== 'active') {
      return
    }
    await runtime.adapter.inviteSpeaker(room.externalRoomId, scope.userId)
  }

  /** Stops timers when a room becomes inactive, leaving, or error. */
  onRoomInactive (botId: string, roomId: string): void {
    this.clearRoomTimers(botId, roomId)
  }

  private async ensureRoomRuntime (
    tenantId: string,
    botId: string,
    room: BotRoom,
    adapter: CommunityPlatformAdapter,
    generation: number
  ): Promise<void> {
    const activeRoom = await this.deps.rooms.findByIdAndTenantAndBot(room.id, tenantId, botId)
    if (activeRoom == null || activeRoom.status !== 'active') {
      return
    }
    await this.performJoinPing(tenantId, botId, activeRoom, adapter)
    // A stop won while we pinged; do not arm timers for a stopped bot.
    if (!this.isCurrentGeneration(botId, generation)) {
      this.runtimes.delete(botId)
      return
    }
    this.startRoomTimers(tenantId, botId, activeRoom, adapter)
  }

  private startRoomTimers (
    tenantId: string,
    botId: string,
    room: BotRoom,
    adapter: CommunityPlatformAdapter
  ): void {
    const key = this.timerKey(botId, room.id)
    if (this.roomTimers.has(key)) {
      return
    }

    const timers: RoomTimers = {}
    timers.sync = setInterval(() => {
      void this.syncRoom({ tenantId, botId, roomId: room.id })
    }, DEFAULT_SYNC_INTERVAL_MS)

    if (adapter.ping != null) {
      timers.ping = setInterval(() => {
        void this.pingRoom({ tenantId, botId, roomId: room.id })
      }, DEFAULT_ACTIVE_PING_INTERVAL_MS)
    }

    this.roomTimers.set(key, timers)
  }

  /**
   * Join-time active ping with a bounded retry budget. A bot that just joined a
   * channel can hit a transient failure (connection reset, rate limit) before
   * the server registers the membership, so the immediate ping retries instead
   * of silently waiting up to a full ping interval. Auth failures are terminal
   * and never retried.
   */
  private async performJoinPing (
    tenantId: string,
    botId: string,
    room: BotRoom,
    adapter: CommunityPlatformAdapter
  ): Promise<void> {
    for (let attempt = 1; attempt <= JOIN_PING_RETRY_ATTEMPTS; attempt += 1) {
      const result = await this.performPing(tenantId, botId, room, adapter, attempt, JOIN_PING_RETRY_ATTEMPTS)
      if (result.ok || !result.retryable || attempt === JOIN_PING_RETRY_ATTEMPTS) {
        return
      }
      await delay(JOIN_PING_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1))
    }
  }

  private async performPing (
    tenantId: string,
    botId: string,
    room: BotRoom,
    adapter: CommunityPlatformAdapter,
    attempt?: number,
    maxAttempts?: number
  ): Promise<PingResult> {
    if (adapter.ping == null) {
      return { ok: true, retryable: false }
    }
    try {
      await adapter.ping(room.externalRoomId)
      return { ok: true, retryable: false }
    } catch (error) {
      const clubhouseError = this.extractClubhouseError(error)
      if (clubhouseError?.authenticationFailure === true) {
        logger.error('Active ping authentication failure; invalidating credential', {
          tenantId,
          botId,
          roomId: room.id,
          externalRoomId: room.externalRoomId,
          status: clubhouseError.status
        })
        await this.handleAuthFailure(tenantId, botId, room.id)
        return { ok: false, retryable: false }
      }
      logger.warn('Active ping failed for room; keeping runtime alive for retry', {
        tenantId,
        botId,
        roomId: room.id,
        externalRoomId: room.externalRoomId,
        retryable: clubhouseError?.retryable ?? true,
        status: clubhouseError?.status,
        attempt,
        maxAttempts
      })
      return { ok: false, retryable: clubhouseError?.retryable ?? true }
    }
  }

  /**
   * A credential authentication failure (401/403) invalidates the whole bot:
   * the credential belongs to the Bot, not a single Room, so every room using
   * it must stop immediately instead of waiting for its own ping to fail.
   */
  private async handleAuthFailure (tenantId: string, botId: string, roomId: string): Promise<void> {
    const credential = await this.deps.credentials.getActiveByBot(tenantId, botId)
    if (credential != null) {
      await this.deps.credentials.markInvalid(tenantId, credential.id)
    }
    // Bump the lifecycle generation so any in-flight start aborts and every
    // per-bot timer is torn down.
    const existing = this.startup.get(botId)
    const generation = (existing?.generation ?? 0) + 1
    this.clearBotTimers(botId)
    this.runtimes.delete(botId)

    await this.deps.bots.update(tenantId, botId, { status: 'error' })
    const rooms = await this.deps.rooms.findByBotAndTenant(botId, tenantId)
    for (const room of rooms) {
      if (room.status === 'active' || room.status === 'joining') {
        await this.deps.roomService.update(tenantId, room.id, { status: 'error' })
      }
    }
    this.startup.set(botId, { status: 'error', generation })
    logger.error('Bot runtime stopped after credential authentication failure', {
      tenantId,
      botId,
      roomId,
      credentialId: credential?.id
    })
  }

  private extractClubhouseError (error: unknown): ClubhouseApiError | undefined {
    if (error instanceof ClubhouseApiError) {
      return error
    }
    if (error != null && typeof error === 'object' && 'cause' in error) {
      const cause = (error as { cause?: unknown }).cause
      if (cause instanceof ClubhouseApiError) {
        return cause
      }
    }
    return undefined
  }

  private timerKey (botId: string, roomId: string): string {
    return `${botId}:${roomId}`
  }

  private clearRoomTimers (botId: string, roomId: string): void {
    const key = this.timerKey(botId, roomId)
    const timers = this.roomTimers.get(key)
    if (timers == null) {
      return
    }
    if (timers.sync != null) {
      clearInterval(timers.sync)
    }
    if (timers.ping != null) {
      clearInterval(timers.ping)
    }
    this.roomTimers.delete(key)
  }

  private clearBotTimers (botId: string): void {
    for (const key of [...this.roomTimers.keys()]) {
      if (key.startsWith(`${botId}:`)) {
        const [, roomId] = key.split(':')
        if (roomId != null) {
          this.clearRoomTimers(botId, roomId)
        }
      }
    }
  }
}
