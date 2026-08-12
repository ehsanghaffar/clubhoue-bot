/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type { RequestHandler } from 'express'
import type { BotService } from '../../core/bots/bot.service.js'
import type { BotManager } from '../../core/bots/bot-manager.js'
import type { AiConfig } from '../../core/bots/bot.types.js'
import type { BotUpdateInput } from '../../core/bots/bot.repository.js'
import type { Platform } from '../../core/types.js'
import { createBadRequestError, createNotFoundError } from '../../utils/errors.js'

export interface BotsControllerDeps {
  botService: BotService
  botManager: BotManager
}

/** Shape produced by the Joi validation middleware (see validation/bots.schema.ts). */
interface BotBody {
  name?: string
  platform?: string
  personality?: string | null
  welcomeMessage?: string | null
  aiConfig?: Partial<AiConfig>
}

export interface BotsController {
  list: RequestHandler
  create: RequestHandler
  get: RequestHandler
  update: RequestHandler
  remove: RequestHandler
  start: RequestHandler
  stop: RequestHandler
  me: RequestHandler
}

export const createBotsController = (deps: BotsControllerDeps): BotsController => {
  const list: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      const bots = await deps.botService.listByTenant(req.tenant!.id)
      res.json({ data: bots })
    } catch (err) {
      next(err)
    }
  }

  const create: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      const body = req.body as BotBody
      const bot = await deps.botService.createBot({
        tenantId: req.tenant!.id,
        name: body.name!,
        platform: body.platform as Platform,
        personality: body.personality ?? undefined,
        welcomeMessage: body.welcomeMessage ?? undefined,
        aiConfig: body.aiConfig
      })
      res.status(201).json({ data: bot })
    } catch (err) {
      next(err)
    }
  }

  const get: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      if (req.bot == null) {
        next(createNotFoundError('Bot not found'))
        return
      }
      res.json({ data: req.bot })
    } catch (err) {
      next(err)
    }
  }

  const update: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      const bot = req.bot
      if (bot == null) {
        next(createNotFoundError('Bot not found'))
        return
      }
      const body = req.body as BotBody
      const patch: BotUpdateInput = {}
      if (body.name !== undefined) patch.name = body.name
      if (body.personality !== undefined) patch.personality = body.personality ?? undefined
      if (body.welcomeMessage !== undefined) patch.welcomeMessage = body.welcomeMessage ?? undefined
      // The repository replaces the whole aiConfig subdocument, so merge the
      // partial patch into the current config to avoid wiping unset fields.
      if (body.aiConfig !== undefined) patch.aiConfig = { ...bot.aiConfig, ...body.aiConfig }
      const updated = await deps.botService.updateBot(bot.tenantId, bot.id, patch)
      res.json({ data: updated ?? bot })
    } catch (err) {
      next(err)
    }
  }

  const remove: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      const bot = req.bot
      if (bot == null) {
        next(createNotFoundError('Bot not found'))
        return
      }
      // Stop any running loops first, otherwise orphaned runtime state remains.
      await deps.botManager.stopBot(bot.id)
      await deps.botService.deleteBot(bot.tenantId, bot.id)
      res.status(204).end()
    } catch (err) {
      next(err)
    }
  }

  const start: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      const bot = req.bot
      if (bot == null) {
        next(createNotFoundError('Bot not found'))
        return
      }
      await deps.botManager.startBot(bot.id)
      const updated = await deps.botService.getByIdAndTenant(bot.id, bot.tenantId)
      res.json({ data: updated ?? bot })
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      if (message.includes('No active credential')) {
        next(createBadRequestError('Bot has no active credential'))
        return
      }
      next(err)
    }
  }

  const stop: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      const bot = req.bot
      if (bot == null) {
        next(createNotFoundError('Bot not found'))
        return
      }
      await deps.botManager.stopBot(bot.id)
      const updated = await deps.botService.getByIdAndTenant(bot.id, bot.tenantId)
      res.json({ data: updated ?? bot })
    } catch (err) {
      next(err)
    }
  }

  /** Migrated from legacy POST /api/channels/me — the bot's own profile. */
  const me: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      const bot = req.bot
      if (bot == null) {
        next(createNotFoundError('Bot not found'))
        return
      }
      const externalId = await deps.botService.getBotExternalUserId(bot.tenantId, bot.id)
      if (externalId == null) {
        next(createBadRequestError('Bot has no active credential'))
        return
      }
      const adapter = await deps.botService.createAdapter(bot)
      const user = await adapter.getUser(externalId)
      res.json({ data: user })
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      if (message.includes('No active credential')) {
        next(createBadRequestError('Bot has no active credential'))
        return
      }
      next(err)
    }
  }

  return { list, create, get, update, remove, start, stop, me }
}
