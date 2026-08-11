/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type { RequestHandler } from 'express'
import type { BotService } from '../../core/bots/bot.service.js'
import { createBadRequestError, createNotFoundError } from '../../utils/errors.js'

export interface UsersControllerDeps {
  botService: BotService
}

export interface UsersController {
  search: RequestHandler
  get: RequestHandler
}

/** Express 5 allows repeated route params (string[]); normalize to a string. */
const param = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value

/**
 * User operations migrated from the legacy /api profiles+users surfaces. All
 * calls go through the bot's platform adapter, so they are tenant-scoped and
 * use the bot's own credential rather than a process-global profile token.
 */
export const createUsersController = (deps: UsersControllerDeps): UsersController => {
  const search: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      const bot = req.bot
      if (bot == null) {
        next(createNotFoundError('Bot not found'))
        return
      }
      const body = req.body as { query?: string }
      const adapter = await deps.botService.createAdapter(bot)
      const users = await adapter.searchUsers(body.query ?? '')
      res.json({ data: users })
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      if (message.includes('No active credential')) {
        next(createBadRequestError('Bot has no active credential'))
        return
      }
      next(err)
    }
  }

  const get: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      const bot = req.bot
      if (bot == null) {
        next(createNotFoundError('Bot not found'))
        return
      }
      const userId = param(req.params.userId)
      const adapter = await deps.botService.createAdapter(bot)
      const user = await adapter.getUser(userId ?? '')
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

  return { search, get }
}
