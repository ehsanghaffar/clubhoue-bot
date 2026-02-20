import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import http from 'http';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';

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
  apis: ['./dist/routes/*.js', './dist/routes/**/*.js'],
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
      console.log(`Server running at http://localhost:${port}`);
    });

    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use. Kill the running process or change PORT.`);
        process.exit(1);
      }
      console.error('Server error:', err);
      process.exit(1);
    });

    process.on('SIGINT', () => {
      console.log('Received SIGINT — shutting down');
      server.close(() => process.exit(0));
    });

    process.on('SIGTERM', () => {
      console.log('Received SIGTERM — shutting down');
      server.close(() => process.exit(0));
    });

    process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });

    process.on('uncaughtException', (err: Error) => {
      console.error('Uncaught Exception thrown:', err);
      process.exit(1);
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Bootstrap failed:', message);
    process.exit(1);
  }
};

bootstrap();
