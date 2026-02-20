# Clubhouse Full API Bot

## Project Overview

This is a **Node.js/Express backend service** that acts as a bot and API wrapper for the Clubhouse social audio platform. It provides REST endpoints for interacting with Clubhouse rooms, channels, users, and messages, along with integration with OpenAI for chatbot functionality.

### Core Features

- **Clubhouse API Integration**: Wrapper service for Clubhouse API operations (join/leave rooms, send messages, accept invites, etc.)
- **REST API**: Express-based endpoints for channel management, user profiles, and room interactions
- **MongoDB Database**: Stores user tokens, profiles, and room-related data using Mongoose ODM
- **Chatbot Integration**: OpenAI-powered chatbot routes for AI interactions
- **Pomodoro/Channel Routes**: Specialized routes for channel-based automation
- **Proxy Support**: Optional proxy configuration for API requests

### Architecture

```
clubhoue-bot/
├── server.js              # Express app entry point
├── src/
│   ├── routes/            # API route handlers
│   ├── controllers/       # Business logic controllers
│   ├── services/          # External API services (Clubhouse, OpenAI)
│   ├── models/            # Mongoose schemas (User, Token, Room messages)
│   ├── middlewares/       # Express middlewares (auth, error handling)
│   ├── config/            # Configuration (database connection)
│   ├── api/               # Clubhouse API definitions
│   ├── api-ts/            # TypeScript API definitions
│   ├── helper/            # Helper utilities
│   ├── lib/               # Library code
│   ├── types/             # Type definitions
│   └── utils/             # Utility functions
├── tools/                 # CLI utility scripts (LIC, LOC counters)
└── mongodb/               # Local MongoDB data (docker volume)
```

## Building and Running

### Prerequisites

- Node.js 16+
- MongoDB (local or remote)
- Docker & Docker Compose (optional, for containerized deployment)

### Environment Setup

1. Copy `.env.example` to `.env` and configure:

```bash
PORT=4000
JWTPRIVATEKEY="secretkey"
SALT=10
auth_token=<your_clubhouse_auth_token>
NODE_ENV=development
MONGODB_URL=<your_mongodb_connection_string>
OPENAI_API_KEY=<your_openai_api_key>
```

2. Install dependencies:

```bash
npm install
```

### Running the Application

**Development mode (with nodemon):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

**With proxy configuration:**
```bash
npm run start:proxy
```

### Docker Deployment

**Using Docker Compose (recommended):**
```bash
docker-compose up --build
```

This starts:
- The application container (`clubmaster`) on port 4100
- MongoDB container (`club_database`) on port 27020

**Manual Docker:**
```bash
docker build -t clubhouse-bot .
docker run -p 4000:4000 --env-file .env clubhouse-bot
```

### Testing

Run linting:
```bash
npm run lint
```

### Utility Commands

```bash
npm run lic    # Count licenses in project
npm run loc    # Count lines of code
```

## API Endpoints

### Base Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| GET | `/api/channels` | Get all channels |
| GET | `/api/all_users` | Get all users from database |
| POST | `/api/add_profile` | Add user token to database |
| POST | `/api/join_room` | Join a Clubhouse room |
| POST | `/api/accept_invite` | Accept speaker invite |
| POST | `/api/leave` | Leave a room |
| POST | `/api/current-channel` | Get current channel info |
| POST | `/api/room-msgs` | Get room messages |
| POST | `/api/send-room-msg` | Send message to room |
| POST | `/api/me` | Get current user profile |

### Chatbot Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/chat/*` | OpenAI chatbot interactions |

### Pomodoro/Channel Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/pomo/*` | Channel automation features |

## Development Conventions

### Code Style

- **Linting**: ESLint with Standard config + TypeScript support
- **Parser**: `babel-eslint` for JavaScript, `@typescript-eslint/parser` for TypeScript
- **Config**: `.eslintrc.js`

### TypeScript

- TypeScript is used for type definitions (`.d.ts` files)
- Configuration in `tsconfig.json`
- Strict null checks enabled

### Project Structure

- **Controllers**: Handle business logic and route handlers
- **Services**: External API integrations (Clubhouse, OpenAI)
- **Models**: Mongoose schemas for database operations
- **Middlewares**: Auth handling and error handling
- **Routes**: Express router definitions

### License

MIT License - See `LICENSE` file for details.

### Author

Ehsan Ghaffar <info@ehsanghaffarii.ir>

## Key Dependencies

| Package | Purpose |
|---------|---------|
| `express` | Web framework |
| `mongoose` | MongoDB ODM |
| `jsonwebtoken` | JWT authentication |
| `bcrypt` | Password hashing |
| `openai` | OpenAI API integration |
| `cors` | CORS middleware |
| `body-parser` | Request body parsing |
| `joi` | Schema validation |
| `dotenv` | Environment variables |
| `nodemon` | Development auto-reload |

## Notes

- The project uses a custom Clubhouse API client located in `src/api/`
- Profile tokens are stored in `profile.json` (generated at runtime)
- The application maintains an active ping loop for rooms (every 3 minutes)
- Debug mode is enabled by default (`DEBUG=*`)
