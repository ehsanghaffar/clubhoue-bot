![Lines of Code](https://img.shields.io/badge/Lines%20of%20Code-4352-blue)

```
Language                 Files       Lines     Blank     Comment        Code
----------------------------------------------------------------------------
TypeScript                 124        6396       970        1181        4245
YAML                         2          68         9           0          59
JavaScript                   1          53         1           4          48
----------------------------------------------------------------------------
Total                      127        6517       980        1185        4352
----------------------------------------------------------------------------
```


![Lines of Code](https://img.shields.io/badge/Lines%20of%20Code-4352-blue)

# Clubhouse Full API Bot

An **unofficial Node.js/Express backend** that acts as a bot and API wrapper for the **Clubhouse social audio platform**. It provides REST endpoints for rooms, channels, users, clubs, events, and messaging, plus an **OpenAI-powered chatbot** and a **Pomodoro timer** for channel-based automation.

---

## Features

- **Room Management** — Join/leave rooms, accept speaker invites, invite speakers, active ping to maintain presence
- **Channel Messaging** — Send/receive messages, emoji reactions, manage channels (create, public/social)
- **User & Club Operations** — Search users/clubs, follow/unfollow, get profiles, followers, following lists
- **Events** — Create, edit, delete, and list Clubhouse events
- **Topics** — Add/remove topics, browse users and clubs by topic
- **Notifications** — Fetch and update notification settings
- **AI Chatbot** — GPT-powered bot that answers questions in rooms (triggered by `#` prefix)
- **Pomodoro Timer** — Configurable timer for channel-based productivity sessions
- **Swagger API Docs** — Interactive API documentation at `/api-docs`
- **Docker Support** — One-command setup with MongoDB

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 18 |
| Framework | Express 4 |
| Language | TypeScript 4 |
| Database | MongoDB 6 (Mongoose 6) |
| AI | OpenAI API (GPT) |
| Auth | JWT + bcrypt |
| Validation | Joi |
| Logging | Winston |
| Docs | Swagger (swagger-jsdoc + swagger-ui-express) |
| Container | Docker + Docker Compose |

---

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB 6 (or Docker)
- A Clubhouse account with `profile.json` (see [Authentication](#authentication))
- (Optional) OpenAI API key for chatbot features

### Installation

```bash
git clone <repo-url>
cd clubhoue-bot
npm install
```

### Configuration

Copy `.env.example` to `.env` and fill in the values:

```env
PORT=4000
JWT_PRIVATE_KEY="your-secure-jwt-secret-here"
SALT=10
NODE_ENV=development
MONGODB_URL=mongodb://127.0.0.1:27017/clubhouse
OPENAI_API_KEY=sk-...
AGORA_KEY=
PUBNUB_PUB_KEY=
PUBNUB_SUB_KEY=
```

### Authentication

The app requires a `profile.json` in the project root with your Clubhouse session credentials. This file is loaded at startup by the service initializer and is **gitignored**. It should contain:

- `token` — Clubhouse auth token
- `userId` — Your user ID
- `deviceId` — Device identifier
- `apiRoot` — Clubhouse API base URL
- `userAgent` / `appVersion` — Client fingerprint
- `pubnub` — PubNub keys for real-time messaging
- `agoraKey` — Agora key for audio rooms

### Run

```bash
# Development (with auto-reload)
npm run dev

# Production
npm run build && npm start
```

### Docker

```bash
docker compose up -d
```

This starts the app on port `4000` and MongoDB on port `27020`.

---

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Development with nodemon hot-reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled production build |
| `npm run start:dev` | Run directly via ts-node |
| `npm run typecheck` | Type-check without emitting |
| `npm run lint` | Lint all source files |
| `npm run lint:fix` | Lint and auto-fix |
| `npm run stop` | Stop PM2-managed process |

---

## API Endpoints

### Profiles
| Method | Path | Description |
|--------|------|-------------|
| POST | `/profiles` | Add profile (save Clubhouse auth data) |
| GET | `/profiles/search` | Search Clubhouse users |
| GET | `/profiles/:username` | Get user by username |

### Users
| Method | Path | Description |
|--------|------|-------------|
| GET | `/users/following` | Get users you follow |
| GET | `/users/followers` | Get your followers |
| POST | `/users/follow` | Follow a user |
| POST | `/users/unfollow` | Unfollow a user |
| GET | `/users/suggested` | Get suggested follows |

### Channels
| Method | Path | Description |
|--------|------|-------------|
| GET | `/channels` | List available channels |
| GET | `/channels/:channelId` | Get channel details |
| POST | `/channels/join` | Join a channel |
| POST | `/channels/leave` | Leave a channel |
| POST | `/channels/message` | Send a channel message |
| POST | `/channels/accept-speaker` | Accept speaker invite |
| POST | `/channels/invite-speaker` | Invite speaker |

### Chatbot
| Method | Path | Description |
|--------|------|-------------|
| POST | `/chatbot/message` | Ask the AI chatbot a question |

### Channel Timer
| Method | Path | Description |
|--------|------|-------------|
| POST | `/channel/timer` | Manage Pomodoro timer |

Full interactive documentation is available at `/api-docs` when the server is running.

---

## Project Structure

```
src/
├── server.ts                  # Express app entry point
├── api/                       # Clubhouse API endpoint functions (60+ files)
├── config/                    # App configuration & constants
│   ├── db/db.ts               # MongoDB connection
│   └── profile/               # Auth profile loader
├── controllers/               # Route handler logic
├── helper/                    # Custom HTTP agent for Clubhouse API
├── lib/                       # Axios-based HTTP service wrapper
├── middlewares/               # JWT auth & error handling
├── models/                    # Mongoose schemas (User, Token, RoomMessage, RoomUser)
├── routes/                    # Express route definitions
├── services/                  # Business logic
│   ├── club-api.service.ts    # Main Clubhouse API wrapper
│   ├── channel.service.ts     # Channel operations
│   ├── openai.service.ts      # OpenAI integration
│   └── timer.service.ts       # Pomodoro timer
├── types/                     # TypeScript type definitions
└── utils/                     # Utilities & helpers
```

---

## Architecture

```
Routes → Controllers → Services → Clubhouse API (helper/agent.ts) → Clubhouse
                                  → MongoDB (Mongoose models)
                                  → OpenAI API
```

The core HTTP client (`src/helper/agent.ts`) mimics the Clubhouse mobile app by setting appropriate headers (`CH-Languages`, `CH-Locale`, `CH-AppVersion`, `CH-DeviceId`, etc.) to authenticate requests against the Clubhouse platform.

---

## License

MIT © [Ehsan Ghaffar](mailto:info@ehsanghaffarii.ir)

```
Language                 Files       Lines     Blank     Comment        Code
----------------------------------------------------------------------------
TypeScript                 124        6396       970        1181        4245
YAML                         2          68         9           0          59
JavaScript                   1          53         1           4          48
----------------------------------------------------------------------------
Total                      127        6517       980        1185        4352
----------------------------------------------------------------------------
```
