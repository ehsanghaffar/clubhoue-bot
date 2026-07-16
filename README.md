# Clubhouse Full API Bot

An **unofficial Node.js/Express backend** that acts as a bot and API wrapper for the **Clubhouse social audio platform**. It provides REST endpoints for profile management, user search, channel/room control, chatbot automation, and a channel-based Pomodoro timer.

---

## Features

- **Channel & Room Management** — Join rooms, leave rooms, accept speaker invites, request room users, send room messages, and fetch the active channel feed
- **Profile Management** — Save and switch Clubhouse auth tokens, search users, accept invites, and fetch stored tokens
- **User Search** — Search Clubhouse users by query string
- **AI Chatbot** — Poll channel messages for `#` prefixed questions and reply using OpenAI
- **Pomodoro Timer** — Start a channel timer with emoji notifications for productivity workflows
- **Swagger API Docs** — Interactive documentation available at `/api-docs`
- **Docker Support** — Compose-based development environment with built-in MongoDB

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
LOG_LEVEL=info
```

### Authentication and Session Profile

The app expects a `profile.json` file in the project root. It is loaded at startup by `src/services/service-initializer.ts` and is typically **gitignored**.

The file should contain Clubhouse session data, including at least one of the following:

- `token` — Clubhouse auth token
- `auth_token` — alternate auth token field
- `deviceId` — device identifier
- additional Clubhouse profile fields as required by the mobile API wrapper

The `/profiles` routes can also add or update stored profile tokens.

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
| `npm run start:proxy` | Run the server with `proxy-config.json` |
| `npm run typecheck` | Type-check without emitting |
| `npm run lint` | Lint all source files |
| `npm run lint:fix` | Lint and auto-fix |
| `npm run lic` | Run license tooling |
| `npm run loc` | Count lines of code |
| `npm run stop` | Stop PM2-managed process |

---

## API Endpoints

### Profiles
| Method | Path | Description |
|--------|------|-------------|
| POST | `/profiles/add_profile` | Add a new profile token |
| POST | `/profiles/change-profile` | Change the active profile token in `profile.json` |
| POST | `/profiles/search_users` | Search for Clubhouse users |
| POST | `/profiles/accept_invite` | Accept a speaker invite for a username |
| POST | `/profiles/get_user` | Get a user by ID |
| GET | `/profiles/all_users` | List stored profile tokens |
| GET | `/profiles/get_token` | Get the current profile token |

### Users
| Method | Path | Description |
|--------|------|-------------|
| POST | `/users/search_users` | Search users by query string |

### Channels
| Method | Path | Description |
|--------|------|-------------|
| POST | `/channels/join_room` | Join a room/channel |
| POST | `/channels/accept_invite` | Accept a speaker invite in a channel |
| POST | `/channels/get_room_users` | Get users in a room |
| POST | `/channels/leave` | Leave a room/channel |
| POST | `/channels/channels` | Get the channel feed |
| POST | `/channels/current-channel` | Get the current active channel |
| POST | `/channels/room-msgs` | Get room messages |
| POST | `/channels/send-room-msg` | Send a message to a room |
| POST | `/channels/me` | Get the current user profile from Clubhouse |

### Chatbot
| Method | Path | Description |
|--------|------|-------------|
| POST | `/chatbot/start` | Start the chatbot polling loop for a channel |
| POST | `/chatbot/stop` | Stop the chatbot polling loop |

### Channel Timer
| Method | Path | Description |
|--------|------|-------------|
| POST | `/channel/start-timer` | Start a Pomodoro timer for a channel |

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
