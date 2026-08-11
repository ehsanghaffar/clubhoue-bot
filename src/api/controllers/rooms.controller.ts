/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type { RequestHandler } from 'express'
import type { RoomService } from '../../core/rooms/room.service.js'
import type { BotService } from '../../core/bots/bot.service.js'
import type { BotRoomSettings } from '../../core/rooms/room.types.js'
import { createBadRequestError, createNotFoundError } from '../../utils/errors.js'

export interface RoomsControllerDeps {
  roomService: RoomService
  botService: BotService
}

/** Shape produced by the Joi validation middleware (see validation/rooms.schema.ts). */
interface RoomBody {
  externalRoomId?: string
  settings?: Partial<BotRoomSettings>
}

/** Shape produced by the Joi validation middleware (see validation/messages.schema.ts). */
interface SendMessageBody {
  message?: string
}

export interface RoomsController {
  create: RequestHandler
  list: RequestHandler
  get: RequestHandler
  join: RequestHandler
  leave: RequestHandler
  sendMessage: RequestHandler
  listMessages: RequestHandler
  acceptInvite: RequestHandler
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

  const join: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      const bot = req.bot
      const room = req.room
      if (bot == null || room == null) {
        next(createNotFoundError('Room not found'))
        return
      }
      const adapter = await deps.botService.createAdapter(bot)
      await deps.roomService.join(room, adapter)
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

  return { create, list, get, join, leave, sendMessage, listMessages, acceptInvite }
}
