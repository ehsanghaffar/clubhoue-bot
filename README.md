# Clubhouse Full API Bot

A TypeScript + Express server that acts as an automation bot and API client for the [Clubhouse](https://www.joinclubhouse.com/) social audio platform. It talks to Clubhouse's private mobile API by impersonating the iOS app, and exposes a clean REST + Swagger interface to manage profiles, join audio channels, send messages, run an AI-powered chatbot, and schedule pomodoro timers.

> **Note:** This project calls a **private, undocumented Clubhouse API**. Use it at your own risk and in accordance with Clubhouse's terms of service.

---

## What This Does

In plain English: this server lets you **control a Clubhouse account programmatically**. You give it your account token, and it can search users, join/leave audio rooms, listen for questions, auto-reply with ChatGPT, invite people to the stage, and run focus timers — all through simple HTTP endpoints or the built-in Swagger UI.

Key features:

- 🤖 **AI Chatbot** — watches a channel, answers questions (messages starting with `#`) using OpenAI GPT-4o, and replies directly in the room.
- 🎙️ **Channel automation** — join/leave rooms, fetch feeds and messages, send messages, react with emoji, accept & send speaker invites.
- ⏱️ **Pomodoro timer** — runs a 45-minute focus / 15-minute break cycle per channel, restarting at the top of each hour.
- 🔄 **Active-ping loop** — keeps you "present" in joined channels with periodic pings.
- 🔑 **Multi-profile token management** — store and switch between multiple Clubhouse tokens in MongoDB.
- 📚 **Self-documenting API** — interactive Swagger docs at `/api-docs`.

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Language | TypeScript (strict, ES2022, ESM) |
| Runtime | Node.js 22 |
| Web framework | Express 5 |
| Database | MongoDB via Mongoose 9 |
| AI | OpenAI SDK (GPT-4o) |
| Auth | JWT (`jsonwebtoken`) + `express-rate-limit` |
| Validation | Joi |
| Docs | swagger-jsdoc + swagger-ui-express |
| Logging | Winston (JSON logs → `logs/`) |
| Package manager | pnpm 10 |
| Containerization | Docker (multi-stage build) + docker-compose |

---

## Quick Start

### Prerequisites

- **Node.js** 22+ and **pnpm** 10+
- A running **MongoDB** instance (local or remote)
- (Optional but recommended) a Clubhouse account token and an **OpenAI API key**

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

Create a `.env` file in the project root:

```bash
# Server
PORT=4000
NODE_ENV=development

# Database (defaults to mongodb://127.0.0.1:27017/clubhouse)
MONGODB_URL=mongodb://127.0.0.1:27017/clubhouse

# Required — used to sign/verify JWT auth tokens
JWT_PRIVATE_KEY=your-secret-key-here

# Required for the chatbot to work
OPENAI_API_KEY=sk-...

# Optional logging level (info | debug)
LOG_LEVEL=info
```

### 3. Configure your Clubhouse profile

The bot authenticates with Clubhouse using `profile.json` (an exported account profile containing your `token` / `tokens.auth`, `deviceId`, and user info). If the file is missing, the service starts but operates without credentials — you'll need to provide a valid profile before using Clubhouse endpoints.

### 4. Run it

Development (auto-reload via nodemon):

```bash
pnpm run dev
```

Production:

```bash
pnpm run build
pnpm start
```

You should see `Server running at http://localhost:4000`.

### 5. Open the docs

- Swagger UI → http://localhost:4000/api-docs
- Raw OpenAPI JSON → http://localhost:4000/swagger.json

### Docker (optional)

The repo ships with a multi-stage `Dockerfile`, a `docker-compose.yml` (app + MongoDB), and a `start.sh` launcher:

```bash
docker compose up -d
```

- App: `http://localhost:4000`
- MongoDB container: `mongodb://club_database:27017/clubhouse` (host port `27020`)

---

## Environment Variables

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `PORT` | No | `4000` | HTTP port the server listens on |
| `MONGODB_URL` | No | `mongodb://127.0.0.1:27017/clubhouse` | MongoDB connection string |
| `JWT_PRIVATE_KEY` | **Yes** | — | Secret used to sign/verify JWT tokens (middleware throws if missing) |
| `OPENAI_API_KEY` | Only for chatbot | — | OpenAI API key used by the chatbot service |
| `NODE_ENV` | No | — | `development` / `production` (affects swagger spec paths, error verbosity, console logging) |
| `LOG_LEVEL` | No | `info` | Winston log level |

---

## Project Structure

```
clubhoue-bot/
├── src/                        # TypeScript source
│   ├── server.ts               # Entry point: Express app, Swagger, bootstrap
│   ├── routes/                 # HTTP route definitions
│   │   ├── routes.ts           # Mounts all sub-routers under /api
│   │   ├── profiles.routes.ts  # Profile & token management
│   │   ├── users.routes.ts     # User search
│   │   ├── channels.routes.ts  # Channel/room operations
│   │   ├── chatbot.routes.ts   # Chatbot start/stop
│   │   └── channel.routes.ts   # Pomodoro timer
│   ├── controllers/            # Request handlers
│   │   ├── profile.controller.ts
│   │   ├── channel.controller.ts
│   │   └── welcomeChannel.controller.ts
│   ├── services/               # Business logic
│   │   ├── club-api.service.ts    # Typed wrapper over the Clubhouse agent
│   │   ├── channel.service.ts     # Join/invite/feed logic
│   │   ├── openai.service.ts      # OpenAI client singleton
│   │   ├── service-initializer.ts # Loads profile.json → configures services
│   │   └── timer.service.ts       # Pomodoro cycle logic
│   ├── helper/
│   │   └── agent.ts            # Low-level HTTP client mimicking the iOS app
│   ├── api/                    # 60+ typed wrappers for Clubhouse endpoints
│   │   ├── index.ts
│   │   ├── getChannels.ts, joinChannel.ts, sendChannelMessage.ts, ...
│   │   ├── searchUsers.ts, followUser.ts, updateBio.ts, ...
│   │   └── getEvents.ts, getClubs.ts, getTopics.ts, ...
│   ├── models/                 # Mongoose models
│   │   ├── user.ts, token.ts, roomMessage.ts, roomUser.ts
│   ├── middlewares/
│   │   └── auth.ts             # JWT auth middleware + error handler
│   ├── config/
│   │   ├── constants.ts        # Timings, limits, Clubhouse header constants
│   │   ├── db/db.ts            # MongoDB connection
│   │   └── profile/            # App version metadata
│   ├── utils/                  # logger, errors, message cache, ping manager...
│   └── types/                  # Shared TypeScript type definitions
├── tools/                      # Dev utilities (lic, loc)
├── docs/                       # (optional) additional documentation
├── logs/                       # Winston log output (error.log, combined.log)
├── profile.json                # Clubhouse account credentials (token, device)
├── docker-compose.yml          # App + MongoDB services
├── Dockerfile                  # Multi-stage production image
├── start.sh                    # Container entrypoint (dev vs prod)
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json               # Strict TypeScript config
├── contributing.md             # Engineering & contribution standards
└── LICENSE                     # MIT
```

---

## API Overview

All routes are mounted under `/api`. Interactive docs are available at **`/api-docs`**.

| Group | Endpoint | Description |
| --- | --- | --- |
| **Profiles** | `POST /api/profiles/add_profile` | Save a Clubhouse token under a name |
| | `POST /api/profiles/change-profile` | Switch the active profile token |
| | `POST /api/profiles/search_users` | Search Clubhouse users |
| | `POST /api/profiles/accept_invite` | Accept a speaker invite |
| | `POST /api/profiles/get_user` | Get a user by ID |
| | `GET /api/profiles/all_users` | List all stored tokens |
| | `GET /api/profiles/get_token` | Get the current profile token |
| **Users** | `POST /api/users/search_users` | Search users via the Clubhouse API |
| **Channels** | `POST /api/channels/join_room` | Join a room (starts ping loop) |
| | `POST /api/channels/accept_invite` | Accept a speaker invitation |
| | `POST /api/channels/get_room_users` | Get users in a room |
| | `POST /api/channels/leave` | Leave a room (stops ping loop) |
| | `POST /api/channels/channels` | Get the channel feed |
| | `POST /api/channels/current-channel` | Get current channel info |
| | `POST /api/channels/room-msgs` | Get room messages |
| | `POST /api/channels/send-room-msg` | Send a message to the room |
| | `POST /api/channels/me` | Get the current user profile |
| **Notifications** | `POST /api/notifications` | Get notifications (`size`, `page`) |
| | `POST /api/notifications/actionable` | Get actionable notifications |
| **Chatbot** | `POST /api/chatbot/start` | Start AI replies in a channel |
| | `POST /api/chatbot/stop` | Stop the chatbot loop |
| **Timer** | `POST /api/channel/start-timer` | Start a pomodoro cycle for a channel |

---

## Key Concepts

### The Clubhouse "agent"

`src/helper/agent.ts` is the foundation of the bot. It wraps `fetch` and **mimics the Clubhouse iOS app** — sending the same `User-Agent`, `CH-*` headers (app version, build, device ID, locale), and `Token` authorization the mobile client sends to `https://www.clubhouseapi.com/api`.

`ClubApiService` (`src/services/club-api.service.ts`) builds typed, safe wrappers on top of it (join/leave channels, send messages, search users, etc.), and `src/api/*` are one-file wrappers for individual endpoints.

### Profile & token management

- `profile.json` holds the primary account credentials.
- `ValidToken` (MongoDB) lets you store **multiple tokens by name** and switch between them — e.g. `accept_invite` looks up a user's token by username before acting as them.

### The chatbot

- Polls a channel every **15 seconds**.
- Only reacts to messages that start with `#` (the "question" convention).
- Sends the question to OpenAI (`gpt-4o`), which is instructed to reply briefly (< 270 chars), in the same language, and to protect "Ehsan" as confidential.
- Replies are prefixed with `{user_name} Jan,` and posted back to the room.
- A message cache (`utils/messageCache.ts`) prevents duplicate replies.

### The ping loop

When you join a room, a background ping loop (`utils/pingManager.ts`) sends periodic `activePing` signals so the account stays marked as active. Leaving the room stops it.

### The pomodoro timer

`TimerService` runs a **45-minute focus / 15-minute break** cycle. Each cycle is checked at the top of the hour, and consecutive timers chain without overlapping intervals.

---

## Common Tasks

### Start the chatbot in a channel

```bash
curl -X POST http://localhost:4000/api/chatbot/start \
  -H "Content-Type: application/json" \
  -d '{ "channel": "<channel-id>" }'
```

Questions in the room starting with `#` will now get AI-generated answers. Stop with:

```bash
curl -X POST http://localhost:4000/api/chatbot/stop
```

### Join a room

```bash
curl -X POST http://localhost:4000/api/channels/join_room \
  -H "Content-Type: application/json" \
  -d '{ "channel": "<channel-id>", "source": "feed" }'
```

### Run a pomodoro timer in a channel

```bash
curl -X POST http://localhost:4000/api/channel/start-timer \
  -H "Content-Type: application/json" \
  -d '{ "channel": "<channel-id>", "emoji": "🍅" }'
```

### Register a new Clubhouse token

```bash
curl -X POST http://localhost:4000/api/profiles/add_profile \
  -H "Content-Type: application/json" \
  -d '{ "token": "<40-hex-clubhouse-token>", "name": "my-account" }'
```

### Quality checks

```bash
pnpm run typecheck   # strict type checking
pnpm run lint        # ESLint
pnpm run build       # compile to dist/
```

---

## Troubleshooting

| Problem | Likely cause / fix |
| --- | --- |
| `Server running at http://localhost:4000` never appears / process exits | MongoDB isn't running. Start it (`mongod`) or fix `MONGODB_URL`. |
| `Port 4000 is already in use` | Another process owns the port. Kill it or set `PORT` to a different value. |
| `JWT_PRIVATE_KEY environment variable is required` | Add `JWT_PRIVATE_KEY` to your `.env` file. |
| `Agent and profile not configured` | `profile.json` is missing/invalid. Provide a valid Clubhouse profile. |
| Chatbot doesn't reply | Check `OPENAI_API_KEY` is set, the channel is valid, and messages start with `#`. |
| 401 `Invalid token` / `Token expired` | Your `x-auth-token` header is wrong or stale. |
| `Failed to connect to MongoDB` | Confirm the DB is reachable; the URL is normalized to `127.0.0.1` (avoid `localhost`). |
| Logs seem quiet | Set `LOG_LEVEL=debug` in `.env` for verbose output; files land in `logs/`. |

---

## Contributing

Please read [`contributing.md`](./contributing.md) — it defines the mandatory engineering standards for this repo (strict TypeScript, incremental refactoring, model-first migration order, and CI gates). Open issues and PRs are welcome.

## License

[MIT](./LICENSE) — © Ehsan Ghaffar.
