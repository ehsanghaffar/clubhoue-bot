import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import http from 'http';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import logger from './utils/logger';

dotenv.config();
process.env.DEBUG = '*';

import db from './config/db/db';
import { initializeService } from './services/service-initializer';
import routes from './routes/routes';

const app: Express = express();
const port: number = parseInt(process.env.PORT || '4000', 10);

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Clubhouse API',
    version: '1.0.0',
    description: 'API documentation for Clubhouse bot application',
  },
  servers: [
    {
      url: `http://localhost:${port}/api/`,
      description: 'Development server',
    },
  ],
};

const options = {
  swaggerDefinition,
  apis: process.env.NODE_ENV === 'production' ? ['./dist/routes/*.js', './dist/routes/**/*.js'] : ['./src/routes/**/*.ts'],
};

const swaggerSpec = swaggerJsdoc(options);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
app.use(bodyParser.json());

app.get('/', (_req: Request, res: Response) => {
  res.send('Hello World!');
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/swagger.json', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

app.use('/api', routes);

const bootstrap = async (): Promise<void> => {
  try {
    await db();
    initializeService();

    const server: http.Server = http.createServer(app);

    server.listen(port, () => {
      logger.info(`Server running at http://localhost:${port}`);
    });

    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        logger.error(`Port ${port} is already in use. Kill the running process or change PORT.`);
        process.exit(1);
      }
      logger.error('Server error:', { error: err });
      process.exit(1);
    });

    process.on('SIGINT', () => {
      server.close(() => process.exit(0));
    });

    process.on('SIGTERM', () => {
      server.close(() => process.exit(0));
    });

    process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
      logger.error('Unhandled Rejection at:', { promise, reason });
      process.exit(1);
    });

    process.on('uncaughtException', (err: Error) => {
      logger.error('Uncaught Exception thrown:', { error: err });
      process.exit(1);
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    process.exit(1);
  }
};

bootstrap();
