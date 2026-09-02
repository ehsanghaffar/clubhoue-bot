/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type { RequestHandler } from 'express'
import type { RoomService } from '../../core/rooms/room.service.js'
import type { BotService } from '../../core/bots/bot.service.js'
import type { BotManager } from '../../core/bots/bot-manager.js'
import type { AiService } from '../../core/ai/ai.service.js'
import type { BotRoomSettings } from '../../core/rooms/room.types.js'
import { createBadRequestError, createNotFoundError } from '../../utils/errors.js'

export interface RoomsControllerDeps {
  roomService: RoomService
  botService: BotService
  botManager: BotManager
  aiService: AiService
}

/** Shape produced by the Joi validation middleware (see validation/rooms.schema.ts). */
interface RoomBody {
  externalRoomId?: string
  title?: string
  settings?: Partial<BotRoomSettings>
}

/** Shape produced by the Joi validation middleware (see validation/messages.schema.ts). */
interface SendMessageBody {
  message?: string
}

interface RoomAnalysisBody { question?: string }

export interface RoomsController {
  create: RequestHandler
  list: RequestHandler
  get: RequestHandler
  update: RequestHandler
  remove: RequestHandler
  listAvailable: RequestHandler
  join: RequestHandler
  leave: RequestHandler
  sendMessage: RequestHandler
  listMessages: RequestHandler
  listMembers: RequestHandler
  listBotMembers: RequestHandler
  acceptInvite: RequestHandler
  analyze: RequestHandler
}

export const createRoomsController = (deps: RoomsControllerDeps): RoomsController => {
  const create: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      const bot = req.bot
      if (bot == null) {
        next(createNotFoundError('Bot not found'))
        return
      }
      const body = req.body as RoomBody
      const room = await deps.roomService.createRoom({
        tenantId: bot.tenantId,
        botId: bot.id,
        platform: bot.platform,
        externalRoomId: body.externalRoomId!,
        title: body.title,
        settings: body.settings
      })
      res.status(201).json({ data: room })
    } catch (err) {
      next(err)
    }
  }

  const list: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      const bot = req.bot
      if (bot == null) {
        next(createNotFoundError('Bot not found'))
        return
      }
      const rooms = await deps.roomService.listByBotAndTenant(bot.id, bot.tenantId)
      res.json({ data: rooms })
    } catch (err) {
      next(err)
    }
  }

  const get: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      if (req.room == null) {
        next(createNotFoundError('Room not found'))
        return
      }
      res.json({ data: req.room })
    } catch (err) {
      next(err)
    }
  }

  const update: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      const bot = req.bot
      const room = req.room
      if (bot == null || room == null) return next(createNotFoundError('Room not found'))
      const body = req.body as RoomBody
      const updated = await deps.roomService.updateSettings(bot.tenantId, room.id, body.settings ?? {})
      res.json({ data: updated })
    } catch (err) { next(err) }
  }

  const remove: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      const bot = req.bot
      const room = req.room
      if (bot == null || room == null) return next(createNotFoundError('Room not found'))
      if (room.status === 'active' || room.status === 'joining') {
        const adapter = await deps.botService.createAdapter(bot)
        await deps.roomService.leave(room, adapter)
      }
      deps.botManager.onRoomInactive(bot.id, room.id)
      await deps.roomService.deleteRoom(bot.tenantId, room.id)
      res.status(204).end()
    } catch (err) { next(err) }
  }

  const listAvailable: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      const bot = req.bot
      if (bot == null) return next(createNotFoundError('Bot not found'))
      const adapter = await deps.botService.createAdapter(bot)
      res.json({ data: await adapter.listAvailableRooms() })
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      if (message.includes('No active credential')) return next(createBadRequestError('Bot has no active credential'))
      next(err)
    }
  }

  const join: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      const bot = req.bot
      const room = req.room
      if (bot == null || room == null) {
        next(createNotFoundError('Room not found'))
        return
      }
      res.json({ data: await deps.botManager.joinRoom({ tenantId: bot.tenantId, botId: bot.id, roomId: room.id }) })
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      if (message.includes('No active credential')) {
        next(createBadRequestError('Bot has no active credential'))
        return
      }
      next(err)
    }
  }

  const leave: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      const bot = req.bot
      const room = req.room
      if (bot == null || room == null) {
        next(createNotFoundError('Room not found'))
        return
      }
      const adapter = await deps.botService.createAdapter(bot)
      await deps.roomService.leave(room, adapter)
      deps.botManager.onRoomInactive(bot.id, room.id)
      const updated = await deps.roomService.findByIdAndTenantAndBot(room.id, bot.tenantId, bot.id)
      res.json({ data: updated ?? room })
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      if (message.includes('No active credential')) {
        next(createBadRequestError('Bot has no active credential'))
        return
      }
      next(err)
    }
  }

  /** Migrated from legacy POST /api/channels/send-room-msg. */
  const sendMessage: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      const bot = req.bot
      const room = req.room
      if (bot == null || room == null) {
        next(createNotFoundError('Room not found'))
        return
      }
      if (room.status !== 'active') return next(createBadRequestError('Join the room before sending messages'))
      const body = req.body as SendMessageBody
      const adapter = await deps.botService.createAdapter(bot)
      await adapter.sendMessage(room.externalRoomId, body.message ?? '')
      res.json({ data: { ok: true } })
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      if (message.includes('No active credential')) {
        next(createBadRequestError('Bot has no active credential'))
        return
      }
      next(err)
    }
  }

  /** Migrated from legacy POST /api/channels/room-msgs. */
  const listMessages: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      const bot = req.bot
      const room = req.room
      if (bot == null || room == null) {
        next(createNotFoundError('Room not found'))
        return
      }
      if (room.status !== 'active') return next(createBadRequestError('Join the room before reading messages'))
      const adapter = await deps.botService.createAdapter(bot)
      const messages = await adapter.getMessages(room.externalRoomId)
      res.json({ data: messages })
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      if (message.includes('No active credential')) {
        next(createBadRequestError('Bot has no active credential'))
        return
      }
      next(err)
    }
  }

  /** Lists the members observed in a room from durable member tracking. */
  const listMembers: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      const room = req.room
      if (room == null) {
        next(createNotFoundError('Room not found'))
        return
      }
      const members = await deps.roomService.listMembersByRoomIds([room.id])
      res.json({ data: members })
    } catch (err) { next(err) }
  }

  /** Lists all members observed across a bot's rooms. */
  const listBotMembers: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      const bot = req.bot
      if (bot == null) {
        next(createNotFoundError('Bot not found'))
        return
      }
      const rooms = await deps.roomService.listByBotAndTenant(bot.id, bot.tenantId)
      const members = await deps.roomService.listMembersByRoomIds(rooms.map((room) => room.id))
      res.json({ data: members })
    } catch (err) { next(err) }
  }

  /** Migrated from legacy POST /api/channels/accept_invite + /api/profiles/accept_invite. */
  const acceptInvite: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      const bot = req.bot
      const room = req.room
      if (bot == null || room == null) {
        next(createNotFoundError('Room not found'))
        return
      }
      const adapter = await deps.botService.createAdapter(bot)
      await adapter.acceptSpeakerInvite(room.externalRoomId)
      res.json({ data: { ok: true } })
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      if (message.includes('No active credential')) {
        next(createBadRequestError('Bot has no active credential'))
        return
      }
      next(err)
    }
  }

  const analyze: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      const bot = req.bot
      const room = req.room
      if (bot == null || room == null) return next(createNotFoundError('Room not found'))
      if (room.status !== 'active') return next(createBadRequestError('Join the room before analyzing messages'))
      const adapter = await deps.botService.createAdapter(bot)
      const messages = await adapter.getMessages(room.externalRoomId)
      if (messages.length === 0) return next(createBadRequestError('No room messages are available yet'))
      const body = req.body as RoomAnalysisBody
      const result = await deps.aiService.analyzeRoom(bot, messages, body.question)
      res.json({ data: { ...result, messageCount: Math.min(messages.length, 250) } })
    } catch (err) { next(err) }
  }

  return { create, list, get, update, remove, listAvailable, join, leave, sendMessage, listMessages, listMembers, listBotMembers, acceptInvite, analyze }
}
