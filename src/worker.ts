/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import dotenv from 'dotenv'
import logger from './utils/logger.js'
import db from './config/db/db.js'
import { getMissingEnvVars } from './config/environment.js'
import { initializeService } from './services/service-initializer.js'
import { tenantService } from './core/tenants/tenant.service.js'
import { configureEventPipeline } from './core/startup.js'
import { botManager } from './core/bots/index.js'
import { worker } from './workers/index.js'

dotenv.config()

/**
 * Standalone worker process (production path). Boots the same core pipeline
 * as the API but only runs background work — no HTTP server. The MVP still
 * embeds the worker in the API process; this entry becomes the default when a
 * persistent queue (Redis/BullMQ) is introduced (see spec §18).
 */
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
    initializeService()
    configureEventPipeline()
    await botManager.startAll()
    worker.start()

    const shutdown = (signal: string): void => {
      logger.info('Worker shutting down', { signal })
      worker.stop()
      botManager.stopAll()
      process.exit(0)
    }
    process.on('SIGINT', () => { shutdown('SIGINT') })
    process.on('SIGTERM', () => { shutdown('SIGTERM') })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error('Failed to start worker:', { error: message })
    process.exit(1)
  }
}

void bootstrap()
