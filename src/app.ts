/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import express, { type Express, type Request, type Response } from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import swaggerUi from 'swagger-ui-express'
import rateLimit from 'express-rate-limit'
import { errorHandler } from './middlewares/error-handler.js'
import { createV1Router } from './api/routes/v1.routes.js'
import { buildV1OpenApiSpec } from './api/openapi/v1.openapi.js'
import { botService, botManager } from './core/bots/index.js'
import { credentialService } from './core/credentials/credential.service.js'
import { roomService } from './core/rooms/index.js'
import { usageService, analyticsService } from './core/usage/index.js'
import type { BotService } from './core/bots/bot.service.js'
import type { BotManager } from './core/bots/bot-manager.js'
import type { CredentialService } from './core/credentials/credential.service.js'
import type { RoomService } from './core/rooms/room.service.js'
import type { UsageService } from './core/usage/usage.service.js'
import type { AnalyticsService } from './core/usage/analytics.service.js'
import type { TenantService } from './core/tenants/tenant.service.js'

export interface AppOptions {
  botService?: BotService
  botManager?: BotManager
  credentialService?: CredentialService
  roomService?: RoomService
  usageService?: UsageService
  analyticsService?: AnalyticsService
  tenantService?: TenantService
}

/**
 * Builds the Express application. Kept separate from bootstrap/listen logic so
 * tests can construct the app with injected dependencies.
 */
export const createApp = (options: AppOptions = {}): Express => {
  const app: Express = express()

  const botSvc = options.botService ?? botService
  const botMgr = options.botManager ?? botManager
  const credentialSvc = options.credentialService ?? credentialService
  const roomSvc = options.roomService ?? roomService
  const usageSvc = options.usageService ?? usageService
  const analyticsSvc = options.analyticsService ?? analyticsService
  const tenantSvc = options.tenantService

  const port = parseInt(process.env.PORT ?? '4000', 10)
  const swaggerSpec = buildV1OpenApiSpec(port)

  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 100,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
      error: {
        type: 'RATE_LIMITED',
        message: 'Too many requests, please try again later.'
      }
    }
  })

  app.use(bodyParser.urlencoded({ extended: true }))
  app.use(cors())
  app.use(bodyParser.json())

  app.get('/', (_req: Request, res: Response) => {
    res.send('Hello World!')
  })

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', uptime: process.uptime() })
  })

  app.get('/openapi.json', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json')
    res.send(swaggerSpec)
  })

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

  app.use('/v1', apiLimiter)
  app.use('/v1', createV1Router({
    botService: botSvc,
    botManager: botMgr,
    credentialService: credentialSvc,
    roomService: roomSvc,
    usageService: usageSvc,
    analyticsService: analyticsSvc,
    tenantService: tenantSvc
  }))

  app.use(errorHandler)

  return app
}

export default createApp
