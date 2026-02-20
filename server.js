const express = require('express')
const cors = require('cors')
const http = require('http')
// const rateLimit = require('express-rate-limit')
require('dotenv').config();
process.env.DEBUG = '*'
const app = express()
const bodyParser = require('body-parser')
const db = require('./src/config/db/db');
const { initializeService } = require('./src/services/serviceInitializer');
// const users = require("./src/routes/users");
// const auth = require("./src/routes/auth");
const routes = require('./src/routes/routes')
const { errorHandler } = require('./src/middlewares/auth');
const port = process.env.PORT || 4000

// Swagger setup
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

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
  apis: ['./src/routes/*.js', './src/routes/**/*.js'], // Paths to files containing OpenAPI definitions
};

const swaggerSpec = swaggerJsdoc(options);


app.use(bodyParser.urlencoded({ extended: true }))
app.use(cors())
app.use(bodyParser.json())

// Rate limiting
// const apiLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // 100 requests per window
//   message: 'Too many requests from this IP, please try again later.',
//   standardHeaders: true,
//   legacyHeaders: false,
// });

// const chatLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 10, // Stricter limit for OpenAI calls
//   message: 'Too many chat requests, please try again later.',
//   standardHeaders: true,
//   legacyHeaders: false,
// });

// Apply rate limiting
// app.use('/api', apiLimiter);
// app.use('/api/chatbot', chatLimiter);

app.get('/', (req, res) => {
  res.send('Hello World!')
})

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Route to get swagger json
/**
 * @swagger
 * /swagger.json:
 *   get:
 *     summary: Get OpenAPI specification
 *     tags: [Documentation]
 *     responses:
 *       200:
 *         description: OpenAPI 3.0 specification in JSON format
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
app.get('/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

const server = http.createServer(app)

// app.use("/users", users);
// app.use("/auth", auth);

// Temporarily disable API routes to isolate startup error
app.use("/api", routes)

// middlewares
// app.use(errorHandler)

// Bootstrap: connect DB -> initialize services -> start server
const bootstrap = async () => {
  try {
    await db();
    initializeService();

    const server = require('http').createServer(app)
    server.listen(port, () => console.log(`Server running at http://localhost:${port}`));

    server.on('error', (err) => {
      if (err && err.code === 'EADDRINUSE') {
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

    process.on('unhandledRejection', (reason, p) => {
      console.error('Unhandled Rejection at:', p, 'reason:', reason);
    });
    process.on('uncaughtException', (err) => {
      console.error('Uncaught Exception thrown:', err);
      process.exit(1);
    });
  } catch (err) {
    console.error('Bootstrap failed:', err && err.message ? err.message : err);
    process.exit(1);
  }
};

bootstrap();
