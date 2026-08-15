/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type { RequestHandler } from 'express'
import type { UsageService } from '../../core/usage/usage.service.js'
import type { AnalyticsService } from '../../core/usage/analytics.service.js'
import { createNotFoundError } from '../../utils/errors.js'

export interface UsageControllerDeps {
  usageService: UsageService
  analyticsService: AnalyticsService
}

export interface UsageController {
  summary: RequestHandler
  events: RequestHandler
}

const DEFAULT_EVENT_LIMIT = 50
const MAX_EVENT_LIMIT = 200

export const createUsageController = (deps: UsageControllerDeps): UsageController => {
  const summary: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      const bot = req.bot
      if (bot == null) {
        next(createNotFoundError('Bot not found'))
        return
      }
      const data = await deps.analyticsService.summarizeBot(bot.tenantId, bot.id)
      res.json({ data })
    } catch (err) {
      next(err)
    }
  }

  const events: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      const bot = req.bot
      if (bot == null) {
        next(createNotFoundError('Bot not found'))
        return
      }
      const raw = req.query.limit
      const limit = typeof raw === 'string' && /^\d+$/.test(raw)
        ? Math.min(Math.max(parseInt(raw, 10), 1), MAX_EVENT_LIMIT)
        : DEFAULT_EVENT_LIMIT
      const data = await deps.usageService.listByBotAndTenant(bot.tenantId, bot.id, limit)
      res.json({ data })
    } catch (err) {
      next(err)
    }
  }

  return { summary, events }
}
