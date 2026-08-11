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
import type { CommunityPlatformAdapter } from '../../platforms/adapter.js'
import type { CommunityEvent } from '../events/event.types.js'
import type { RuleContext } from '../automation/automation.types.js'
import { createRuleContext } from '../automation/action-dispatcher.js'
import logger from '../../utils/logger.js'

export interface BotManagerDeps {
  bots: BotRepository
  rooms: RoomRepository
  roomService: RoomService
  botService: BotService
}

interface RuntimeEntry {
  bot: Bot
  adapter: CommunityPlatformAdapter
  botUserId?: string
}

interface LoopEntry {
  roomId: string
  interval: NodeJS.Timeout
}

const DEFAULT_SYNC_INTERVAL_MS = parseInt(process.env.ROOM_SYNC_INTERVAL_MS ?? '15000', 10)

/**
 * Owns the per-bot runtime: builds an adapter per active bot, starts/stops the
 * per-room sync loops (scoped by botId:roomId), and resolves automation rule
 * contexts from the events those loops publish.
 */
export class BotManager {
  private readonly runtimes = new Map<string, RuntimeEntry>()
  private readonly loops = new Map<string, LoopEntry>()

  constructor (private readonly deps: BotManagerDeps) {}

  /**
   * Starts a bot: joins its configured rooms and begins the sync loops.
   * Safe to call more than once (idempotent per room).
   */
  async startBot (botId: string): Promise<void> {
    const bot = await this.deps.bots.findById(botId)
    if (bot == null) {
      throw new Error(`Bot not found: ${botId}`)
    }

    const adapter = await this.deps.botService.createAdapter(bot)
    const botUserId = await this.deps.botService.getBotExternalUserId(botId)

    this.runtimes.set(botId, { bot, adapter, botUserId })

    const rooms = await this.deps.rooms.findByBot(botId)
    for (const room of rooms) {
      if (room.status !== 'active' && room.status !== 'joining') {
        try {
          await this.deps.roomService.join(room, adapter)
        } catch (error) {
          logger.error('Failed to join room', { botId, roomId: room.id, error })
          await this.deps.roomService.update(room.id, { status: 'error' })
          continue
        }
      }
      this.startRoomLoop(bot, room, adapter)
    }

    await this.deps.bots.update(botId, { status: 'active' })
    logger.info('Bot started', { botId })
  }

  /** Stops a bot: clears its loops and marks it stopped. */
  async stopBot (botId: string): Promise<void> {
    for (const [key, entry] of this.loops) {
      if (key.startsWith(`${botId}:`)) {
        clearInterval(entry.interval)
        this.loops.delete(key)
      }
    }
    this.runtimes.delete(botId)
    await this.deps.bots.update(botId, { status: 'stopped' })
    logger.info('Bot stopped', { botId })
  }

  /** Restarts every bot that was previously active (server boot). */
  async startAll (): Promise<void> {
    const active = await this.deps.bots.findByStatus('active')
    for (const bot of active) {
      try {
        await this.startBot(bot.id)
      } catch (error) {
        logger.error('Failed to restart bot on boot', { botId: bot.id, error })
      }
    }
    logger.info('Bot manager started', { activeCount: active.length })
  }

  /** Resolves an automation rule context for a published event. */
  resolveContext = async (event: CommunityEvent): Promise<RuleContext | null> => {
    const runtime = this.runtimes.get(event.botId)
    if (runtime == null) {
      return null
    }
    const room = await this.deps.rooms.findById(event.roomId)
    if (room == null) {
      return null
    }
    return createRuleContext({
      bot: runtime.bot,
      room,
      adapter: runtime.adapter,
      botUserId: runtime.botUserId
    })
  }

  stopAll (): void {
    for (const entry of this.loops.values()) {
      clearInterval(entry.interval)
    }
    this.loops.clear()
    this.runtimes.clear()
  }

  /** Runs a single room sync for a running bot (used by the worker queue). */
  async syncRoomByBot (botId: string, roomId: string): Promise<number> {
    const runtime = this.runtimes.get(botId)
    if (runtime == null) {
      return 0
    }
    const room = await this.deps.rooms.findById(roomId)
    if (room == null || room.status === 'inactive') {
      return 0
    }
    return await this.deps.roomService.syncRoom(room, runtime.adapter)
  }

  /** Sends a keep-alive ping for a running bot's room (active-ping job). */
  async pingRoom (botId: string, roomId: string): Promise<void> {
    const runtime = this.runtimes.get(botId)
    if (runtime == null) {
      return
    }
    if (runtime.adapter.ping == null) {
      return
    }
    await runtime.adapter.ping(roomId)
  }

  /** Invites a user to speak in a running bot's room (speaker-invite job). */
  async inviteSpeaker (botId: string, roomId: string, userId: string): Promise<void> {
    const runtime = this.runtimes.get(botId)
    if (runtime == null) {
      return
    }
    await runtime.adapter.inviteSpeaker(roomId, userId)
  }

  private startRoomLoop (bot: Bot, room: BotRoom, adapter: CommunityPlatformAdapter): void {
    const key = `${bot.id}:${room.id}`
    if (this.loops.has(key)) {
      return
    }
    const interval = setInterval(() => {
      void this.syncRoom(room.id, adapter)
    }, DEFAULT_SYNC_INTERVAL_MS)
    this.loops.set(key, { roomId: room.id, interval })
  }

  private async syncRoom (roomId: string, adapter: CommunityPlatformAdapter): Promise<void> {
    const room = await this.deps.rooms.findById(roomId)
    if (room == null || room.status === 'inactive') {
      return
    }
    try {
      await this.deps.roomService.syncRoom(room, adapter)
    } catch (error) {
      logger.error('Room sync failed', { roomId, error })
    }
  }
}
