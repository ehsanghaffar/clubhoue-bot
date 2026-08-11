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
import swaggerJsdoc from 'swagger-jsdoc'
import rateLimit from 'express-rate-limit'
import { errorHandler } from './middlewares/error-handler.js'
import requireApiKey from './middlewares/api-key.js'
import routes from './routes/routes.js'

/**
 * Dependencies that can be overridden for tests / alternate runtimes.
 *
 * Later phases extend this option bag with repositories, services, the event
 * bus and the worker queue so the HTTP layer stays decoupled from storage.
 * It is declared as a type alias so it can grow without breaking callers.
 */
export type AppOptions = object

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
export const createApp = (_options: AppOptions = {}): Express => {
  const app: Express = express()

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
  // (including profile/token management) is protected by the API key.
  app.use('/api', apiLimiter)
  app.use('/api', requireApiKey, routes)

  // Global error handler must be registered after all routes so that errors
  // thrown by controllers/middleware are normalized into the shared AppError shape.
  app.use(errorHandler)

  return app
}

export default createApp
