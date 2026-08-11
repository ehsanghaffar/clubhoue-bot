/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import express, { type Express, type Request, type RequestHandler, type Response } from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import swaggerUi from 'swagger-ui-express'
import swaggerJsdoc from 'swagger-jsdoc'
import rateLimit from 'express-rate-limit'
import { errorHandler } from './middlewares/error-handler.js'
import requireApiKey from './middlewares/api-key.js'
import routes from './routes/routes.js'
import logger from './utils/logger.js'
import { createV1Router } from './api/routes/v1.routes.js'
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

/**
 * Dependencies that can be overridden for tests / alternate runtimes. Every
 * field is optional and falls back to the production singleton, so callers
 * can inject in-memory services for integration tests without breaking the
 * default wiring.
 */
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
 * Legacy /api deprecation window (RFC 8594). The /api surface keeps working
 * during the migration; consumers should move to the tenant-scoped /v1 API.
 */
const API_DEPRECATED_SINCE = '2026-08-11T00:00:00Z'
const API_SUNSET_DATE = '2027-02-01'

/**
 * Tags every legacy /api response as deprecated so existing consumers get an
 * explicit signal to migrate to /v1 without breaking them mid-transition.
 */
const deprecateLegacyApi: RequestHandler = (req, res, next): void => {
  res.setHeader('Deprecation', new Date(API_DEPRECATED_SINCE).toUTCString())
  res.setHeader('Sunset', API_SUNSET_DATE)
  res.setHeader('Link', '</v1>; rel="successor-version"')
  next()
}

let legacyDeprecationLogged = false

const buildSwaggerSpec = (): object => {
  const port: number = parseInt(process.env.PORT || '4000', 10)
  const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
      title: 'Clubhouse API',
      version: '1.0.0',
      description: 'API documentation for Clubhouse bot application'
    },
    servers: [
      {
        url: `http://localhost:${port}/api/`,
        description: 'Development server'
      }
    ]
  }

  const options = {
    swaggerDefinition,
    apis:
      process.env.NODE_ENV === 'production'
        ? ['./dist/routes/*.js', './dist/routes/**/*.js']
        : ['./src/routes/**/*.ts']
  }

  return swaggerJsdoc(options)
}

/**
 * Builds the Express application. Kept separate from the bootstrap/listen
 * logic so tests can construct the app with injected dependencies and bind it
 * to an ephemeral port.
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

  const swaggerSpec = buildSwaggerSpec()

  app.use(bodyParser.urlencoded({ extended: true }))
  app.use(cors())
  app.use(bodyParser.json())

  app.get('/', (_req: Request, res: Response) => {
    res.send('Hello World!')
  })

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', uptime: process.uptime() })
  })

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

  app.get('/swagger.json', requireApiKey, (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json')
    res.send(swaggerSpec)
  })

  // Legacy Clubhouse API. Authentication is enforced globally so every route
  // (including profile/token management) is protected by the API key. The
  // surface is deprecated (RFC 8594 headers) but kept functional during the
  // migration window — new consumers should use the /v1 API.
  if (!legacyDeprecationLogged) {
    legacyDeprecationLogged = true
    logger.warn('Legacy /api is deprecated. Migrate consumers to /v1 before the sunset date.')
  }
  app.use('/api', deprecateLegacyApi)
  app.use('/api', apiLimiter)
  app.use('/api', requireApiKey, routes)

  // Public /v1 API. Authentication + tenant context is enforced inside the
  // router (with injectable services), and rate limiting applies to the whole
  // surface.
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

  // Global error handler must be registered after all routes so that errors
  // thrown by controllers/middleware are normalized into the shared AppError shape.
  app.use(errorHandler)

  return app
}

export default createApp
