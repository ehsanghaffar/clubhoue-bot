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

type StartupStatus = 'stopped' | 'starting' | 'active' | 'stopping' | 'error'

interface StartupEntry {
  status: StartupStatus
  promise?: Promise<void>
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
    const existing = this.startup.get(botId)
    if (existing?.status === 'starting' && existing.promise != null) {
      await existing.promise
      return
    }
    if (existing?.status === 'active' && this.runtimes.has(botId)) {
      return
    }

    const promise = this.doStartBot(tenantId, botId)
    this.startup.set(botId, { status: 'starting', promise })
    try {
      await promise
      this.startup.set(botId, { status: 'active' })
    } catch (error) {
      this.startup.set(botId, { status: 'error' })
      throw error
    }
  }

  private async doStartBot (tenantId: string, botId: string): Promise<void> {
    const bot = await this.deps.bots.findByIdAndTenant(botId, tenantId)
    if (bot == null) {
      throw new Error(`Bot not found: ${botId}`)
    }

    const credential = await this.deps.credentials.getActiveByBot(tenantId, botId)
    const adapter = await this.deps.botService.createAdapter(bot)
    const botUserId = credential?.externalAccountId ?? await this.deps.botService.getBotExternalUserId(tenantId, botId)

    this.runtimes.set(botId, {
      tenantId,
      bot,
      adapter,
      botUserId,
      externalAccountName: credential?.externalAccountName
    })

    const rooms = await this.deps.rooms.findByBotAndTenant(botId, tenantId)
    for (const room of rooms) {
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
      await this.ensureRoomRuntime(tenantId, botId, room, adapter)
    }

    await this.deps.bots.update(tenantId, botId, { status: 'active' })
    logger.info('Bot started', { tenantId, botId })
  }

  async stopBot (scope: BotRuntimeScope): Promise<void> {
    const { tenantId, botId } = scope
    this.startup.set(botId, { status: 'stopping' })
    this.clearBotTimers(botId)
    this.runtimes.delete(botId)
    await this.deps.bots.update(tenantId, botId, { status: 'stopped' })
    this.startup.set(botId, { status: 'stopped' })
    logger.info('Bot stopped', { tenantId, botId })
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
      this.startup.set(botId, { status: 'stopped' })
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
    adapter: CommunityPlatformAdapter
  ): Promise<void> {
    const activeRoom = await this.deps.rooms.findByIdAndTenantAndBot(room.id, tenantId, botId)
    if (activeRoom == null || activeRoom.status !== 'active') {
      return
    }
    await this.performPing(tenantId, botId, activeRoom, adapter)
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

  private async performPing (
    tenantId: string,
    botId: string,
    room: BotRoom,
    adapter: CommunityPlatformAdapter
  ): Promise<void> {
    if (adapter.ping == null) {
      return
    }
    try {
      await adapter.ping(room.externalRoomId)
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
        return
      }
      logger.warn('Active ping failed for room; keeping runtime alive for retry', {
        tenantId,
        botId,
        roomId: room.id,
        externalRoomId: room.externalRoomId,
        retryable: clubhouseError?.retryable ?? true,
        status: clubhouseError?.status
      })
    }
  }

  private async handleAuthFailure (tenantId: string, botId: string, roomId: string): Promise<void> {
    const credential = await this.deps.credentials.getActiveByBot(tenantId, botId)
    if (credential != null) {
      await this.deps.credentials.markInvalid(tenantId, credential.id)
    }
    this.clearRoomTimers(botId, roomId)
    await this.deps.roomService.update(tenantId, roomId, { status: 'error' })
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
