/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import dotenv from 'dotenv'
import http from 'http'
import logger from './utils/logger.js'
import db from './config/db/db.js'
import { getMissingEnvVars } from './config/environment.js'
import { configureEventPipeline } from './core/startup.js'
import { botManager } from './core/bots/index.js'
import { tenantService } from './core/tenants/tenant.service.js'
import { createApp } from './app.js'
import { registerBuiltinAdapters } from './platforms/register.js'

dotenv.config()
if (process.env.NODE_ENV !== 'production') {
  process.env.DEBUG = '*'
}

const app = createApp()
const port: number = parseInt(process.env.PORT || '4000', 10)

const validateEnvironment = (): void => {
  const missing = getMissingEnvVars()
  if (missing.length > 0) {
    logger.error('Missing required environment variable(s):', { missing })
    process.exit(1)
  }
}

const bootstrap = async (): Promise<void> => {
  try {
    validateEnvironment()
    await db()
    await tenantService.ensureDefaultTenant()
    registerBuiltinAdapters()
    configureEventPipeline()
    await botManager.startAll()

    const server: http.Server = http.createServer(app)

    server.listen(port, () => {
      logger.info(`Server running at http://localhost:${port}`)
    })

    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        logger.error(`Port ${port} is already in use. Kill the running process or change PORT.`)
        process.exit(1)
      }
      logger.error('Server error:', { error: err })
      process.exit(1)
    })

    process.on('SIGINT', () => {
      logger.info('Shutting down (SIGINT)')
      botManager.stopAll()
      server.close(() => process.exit(0))
    })

    process.on('SIGTERM', () => {
      logger.info('Shutting down (SIGTERM)')
      botManager.stopAll()
      server.close(() => process.exit(0))
    })

    process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
      logger.error('Unhandled Rejection at:', { promise, reason })
    })

    process.on('uncaughtException', (err: Error) => {
      logger.error('Uncaught Exception thrown:', { error: err })
      process.exit(1)
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error('Failed to start application:', { error: message })
    process.exit(1)
  }
}

void bootstrap()
