/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import express, { type Express, type Request, type Response } from 'express'
import cors from 'cors'
import http from 'http'
import dotenv from 'dotenv'
import bodyParser from 'body-parser'
import swaggerUi from 'swagger-ui-express'
import swaggerJsdoc from 'swagger-jsdoc'
import rateLimit from 'express-rate-limit'
import logger, { shutdownLogger } from './utils/logger.js'
import fs from 'fs'
import path from 'path'
import net from 'net'

import db from './config/db/db.js'
import { getMissingEnvVars } from './config/environment.js'
import { initializeService } from './services/service-initializer.js'
import { timerService } from './services/timer.service.js'
import { errorHandler } from './middlewares/error-handler.js'
import requireApiKey from './middlewares/api-key.js'
import routes from './routes/routes.js'
import { getActiveLoops, stopPingLoop } from './utils/pingManager.js'

dotenv.config()
if (process.env.NODE_ENV !== 'production') {
  process.env.DEBUG = '*'
}

const app: Express = express()
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
  apis: process.env.NODE_ENV === 'production' ? ['./dist/routes/*.js', './dist/routes/**/*.js'] : ['./src/routes/**/*.ts']
}

const swaggerSpec = swaggerJsdoc(options)

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

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

app.get('/swagger.json', requireApiKey, (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json')
  res.send(swaggerSpec)
})

app.use('/api', apiLimiter)
// app.use('/api', requireApiKey, routes)
app.use('/api', routes)

// Global error handler must be registered after all routes so that errors
// thrown by controllers/middleware are normalized into the shared AppError shape.
app.use(errorHandler)

const validateEnvironment = (): void => {
  const missing = getMissingEnvVars()
  if (missing.length > 0) {
    logger.error('Missing required environment variable(s):', { missing })
    process.exit(1)
  }
}

// track server and resources for graceful shutdown
let server: http.Server | null = null
let mongooseInstance: any = null
let shuttingDown = false
const connections = new Set<net.Socket>()

const bootstrap = async (): Promise<void> => {
  try {
    validateEnvironment()
    // connect to DB and keep the instance for graceful close
    mongooseInstance = await db()
    initializeService()

    server = http.createServer(app)

    // track open connections so they can be destroyed on forced shutdown
    server.on('connection', (socket: net.Socket) => {
      connections.add(socket)
      socket.on('close', () => connections.delete(socket))
    })

    server.listen(port, () => {
      // log structured startup details
      const pkgPath = path.join(process.cwd(), 'package.json')
      let version = 'unknown'
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
        version = pkg.version || version
      } catch (e) {
        // ignore
      }

      logger.info('Server started', {
        pid: process.pid,
        port,
        env: process.env.NODE_ENV ?? 'development',
        node: process.version,
        version
      })
    })

    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        logger.error(`Port ${port} is already in use. Kill the running process or change PORT.`)
        process.exit(1)
      }
      logger.error('Server error:', { error: err })
      process.exit(1)
    })

    const gracefulShutdown = async (exitCode = 0, reason?: string): Promise<void> => {
      if (shuttingDown) return
      shuttingDown = true
      logger.info('Graceful shutdown initiated', { exitCode, reason })

      try {
        // stop background timers/loops
        try {
          timerService.stop()
        } catch (e) {
          logger.warn('timerService.stop() failed', { error: String(e) })
        }

        try {
          const active = getActiveLoops()
          for (const ch of active) {
            try {
              stopPingLoop(ch)
            } catch (e) {
              logger.warn('stopPingLoop failed for channel', { channel: ch, error: String(e) })
            }
          }
        } catch (e) {
          logger.warn('Failed to stop ping loops', { error: String(e) })
        }

        // stop accepting new connections
        if (server) {
          await new Promise<void>((resolve) => {
            server!.close((err) => {
              if (err) logger.error('Error while closing server', { error: err })
              else logger.info('Server closed')
              resolve()
            })
          })
        }

        // give remaining connections a short window to finish, then destroy
        const FORCE_TIMEOUT = 5000
        const forceTimer = setTimeout(() => {
          if (connections.size > 0) {
            logger.warn('Forcing socket destroy for remaining connections', { count: connections.size })
            for (const sock of connections) {
              try {
                sock.destroy()
              } catch (e) {
                // ignore
              }
            }
          }
        }, FORCE_TIMEOUT)

        // close DB connection if available
        try {
          if (mongooseInstance && mongooseInstance.connection) {
            await mongooseInstance.connection.close(false)
            logger.info('Database connection closed')
          }
        } catch (e) {
          logger.warn('Error closing database connection', { error: String(e) })
        }

        clearTimeout(forceTimer)

        // flush and close logger
        try {
          await shutdownLogger(500)
        } catch (e) {
          // swallow logger shutdown errors
        }
      } finally {
        // ensure exit
        process.exit(exitCode)
      }
    }

    process.on('SIGINT', () => {
      void gracefulShutdown(0, 'SIGINT')
    })

    process.on('SIGTERM', () => {
      void gracefulShutdown(0, 'SIGTERM')
    })

    process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
      // A transient failure in a background loop must not take the whole bot down;
      // log it and keep serving.
      logger.error('Unhandled Rejection at:', { promise, reason })
    })

    process.on('uncaughtException', (err: Error) => {
      logger.error('Uncaught Exception thrown:', { error: err })
      // attempt graceful shutdown and exit with failure
      void gracefulShutdown(1, 'uncaughtException')
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error('Failed to start application:', { error: message })
    process.exit(1)
  }
}

void bootstrap()
