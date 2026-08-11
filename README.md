# Clubhouse Full API

A TypeScript + Express server that controls a [Clubhouse](https://www.joinclubhouse.com/) social-audio account programmatically. It talks to Clubhouse's private mobile API by impersonating the iOS app, and exposes a REST + Swagger interface for managing profiles, joining audio channels, sending messages, running an AI chatbot, auto-inviting speakers, and scheduling pomodoro timers.

> **Note:** This project calls a **private, undocumented Clubhouse API**. Use it at your own risk and in accordance with Clubhouse's terms of service.

---

## Features

- 🤖 **AI chatbot** — polls a channel every 15 seconds and answers `#`-prefixed questions with OpenAI (default `gpt-4o`), replying in the same language with `< 270` chars.
- 🎙️ **Channel automation** — join/leave rooms, fetch the feed and room messages, send messages, accept speaker invites, get room users and current-channel info.
- 🗣️ **Auto invite-to-stage** — when a user on the `INVITE_ALLOW_LIST` asks to go on stage (keyword-based, incl. Persian), they are invited to the speakers automatically.
- ⏱️ **Pomodoro timer** — runs a 45-minute focus / 15-minute break cycle per channel, started at the top of each hour.
- 🔄 **Active-ping loop** — keeps the account "present" in joined channels with a ping every 3 minutes.
- 🔑 **Multi-profile token management** — store and switch between multiple Clubhouse tokens via MongoDB + `profile.json`.
- 🔔 **Notifications** — fetch paginated and actionable notifications.
- 📚 **Self-documenting API** — interactive Swagger UI at `/api-docs`.

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Language | TypeScript (strict, ES2022, ESM) |
| Runtime | Node.js 22 |
| Web framework | Express 5 |
| Database | MongoDB via Mongoose 9 |
| AI | OpenAI SDK (`gpt-4o`, configurable) |
| Auth | API key (`x-api-key` header) + `express-rate-limit` |
| Validation | Joi |
| Docs | swagger-jsdoc + swagger-ui-express |
| Logging | Winston (JSON logs → `logs/`) |
| Testing | Vitest |
| Package manager | pnpm 10 |
| Containerization | Docker (multi-stage build) + docker-compose |
| CI | GitHub Actions (typecheck, lint, test, build) |

---

## Quick Start

### Prerequisites

- **Node.js** 22+ and **pnpm** 10+
- A running **MongoDB** instance (local or remote)
- **API keys**: `API_KEY`, `OPENAI_API_KEY`, `AGORA_KEY`, `PUBNUB_PUB_KEY`, `PUBNUB_SUB_KEY`

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

Required variables (the server **exits on boot** if any are missing):

```bash
PORT=4000
API_KEY=your-secure-api-key-here
MONGODB_URL=mongodb://127.0.0.1:27017/clubhouse
OPENAI_API_KEY=sk-...
AGORA_KEY=...
PUBNUB_PUB_KEY=...
PUBNUB_SUB_KEY=...
```

### 3. Configure your Clubhouse profile (optional)

The bot authenticates with Clubhouse using `profile.json` (an exported account profile containing your `token` / `tokens.auth`, `deviceId`, and user info). If the file is missing, the service starts but operates without credentials — you'll need a valid profile before using Clubhouse endpoints.

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
- Raw OpenAPI JSON → http://localhost:4000/swagger.json (requires `x-api-key`)

### Docker (optional)

The repo ships with a multi-stage `Dockerfile`, a `docker-compose.yml` (app + MongoDB), and a `start.sh` launcher:

```bash
docker compose up -d
```

- App: http://localhost:4000
- MongoDB container: `mongodb://club_database:27017/clubhouse` (host port `27020`)

---

## Environment Variables

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `PORT` | No | `4000` | HTTP port the server listens on |
| `API_KEY` | **Yes** | — | Key checked against the `x-api-key` header; server won't boot without it |
| `MONGODB_URL` | **Yes** | `mongodb://127.0.0.1:27017/clubhouse` | MongoDB connection string (`localhost` is normalized to `127.0.0.1`) |
| `OPENAI_API_KEY` | **Yes** | — | OpenAI key used by the chatbot service |
| `AGORA_KEY` | **Yes** | — | Agora (voice) key used by the client metadata |
| `PUBNUB_PUB_KEY` | **Yes** | — | PubNub publish key |
| `PUBNUB_SUB_KEY` | **Yes** | — | PubNub subscribe key |
| `NODE_ENV` | No | — | `development` / `production` (swagger spec paths, error verbosity, console logs, `DEBUG=*`) |
| `LOG_LEVEL` | No | `info` | Winston log level |
| `INVITE_ALLOW_LIST` | No | — | Comma-separated Clubhouse user IDs allowed to be auto-invited to the stage |
| `OPENAI_MODEL` | No | `gpt-4o` | Chatbot model |
| `OPENAI_MAX_TOKENS` | No | `150` | Max tokens per chatbot reply |
| `OPENAI_TEMPERATURE` | No | `0.7` | Chatbot sampling temperature |
| `SALT` | No | `10` | Reserved for password hashing |

---

## Project Structure

```
cl-api/
├── src/                        # TypeScript source
│   ├── server.ts               # Entry point: Express app, Swagger, rate limit, bootstrap
│   ├── config/
│   │   ├── constants.ts        # Timings, message limits, Clubhouse header constants
│   │   ├── environment.ts      # Required-env validation (fails fast on boot)
│   │   ├── index.ts
│   │   ├── db/db.ts            # MongoDB connection (URL normalization + redaction)
│   │   └── profile/            # App/device metadata (lastVersion)
│   ├── controllers/            # Request handlers
│   │   ├── channel.controller.ts
│   │   ├── notifications.controller.ts
│   │   ├── profile.controller.ts
│   │   ├── timer.controller.ts
│   │   ├── users.controller.ts
│   │   └── welcomeChannel.controller.ts
│   ├── helper/
│   │   └── agent.ts            # Low-level HTTP client mimicking the iOS app
│   ├── middlewares/
│   │   ├── api-key.ts          # API-key auth middleware (x-api-key)
│   │   ├── error-handler.ts    # Centralized error normalization
│   │   └── validate.ts         # Joi body validation middleware
│   ├── models/
│   │   └── token.ts            # Mongoose ValidToken model (named tokens)
│   ├── routes/                 # Express routers
│   │   ├── routes.ts           # Mounts all sub-routers under /api
│   │   ├── profiles.routes.ts  # Profile & token management
│   │   ├── users.routes.ts     # User search
│   │   ├── channels.routes.ts  # Channel/room operations
│   │   ├── channel.routes.ts   # Pomodoro timer
│   │   ├── chatbot.routes.ts   # Chatbot start/stop
│   │   └── notifications.routes.ts
│   ├── services/               # Business logic
│   │   ├── club-api.service.ts    # Typed wrappers over the Clubhouse agent
│   │   ├── channel.service.ts     # Feed, join + auto-invite handling
│   │   ├── chatbot.service.ts     # AI reply loop
│   │   ├── openai.service.ts      # Lazy OpenAI client singleton
│   │   ├── service-initializer.ts # Loads profile.json → configures services
│   │   └── timer.service.ts       # Pomodoro cycle logic
│   ├── types/                  # Shared TypeScript definitions
│   ├── utils/
│   │   ├── errors.ts           # AppError + error factories
│   │   ├── logger.ts           # Winston logger
│   │   ├── messageCache.ts     # Deduplicates seen messages (24h TTL)
│   │   └── pingManager.ts      # Active-ping loop per channel
│   └── validation/
│       └── schemas.ts          # Joi schemas for every route body
├── tests/                      # Vitest suite (api-key, error-handler, environment)
├── tools/                      # Dev utilities (loc)
├── logs/                       # Winston output (error.log, combined.log)
├── profile.json                # Clubhouse account credentials (token, device) — gitignored
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

All routes are mounted under `/api`. Interactive docs are available at **`/api-docs`**. A global rate limit of **100 requests/minute** applies to `/api`; profile mutation endpoints additionally allow **10/minute**.

| Group | Endpoint | Description |
| --- | --- | --- |
| **Profiles** | `POST /api/profiles/add_profile` | Save a Clubhouse token under a name |
| | `POST /api/profiles/change-profile` | Switch the active profile token |
| | `POST /api/profiles/search_users` | Search Clubhouse users |
| | `POST /api/profiles/accept_invite` | Accept a speaker invite as a stored user |
| | `POST /api/profiles/get_user` | Get a user by ID |
| | `GET /api/profiles/all_users` | List all stored tokens |
| | `GET /api/profiles/get_token` | Get the current profile token |
| **Users** | `POST /api/users/search_users` | Search users via the Clubhouse API |
| **Channels** | `POST /api/channels/join_room` | Join a room (starts ping loop + invite watcher) |
| | `POST /api/channels/accept_invite` | Accept a speaker invitation |
| | `POST /api/channels/get_room_users` | Get room messages as a stored user |
| | `POST /api/channels/leave` | Leave a room (stops ping loop) |
| | `POST /api/channels/channels` | Get the channel feed |
| | `POST /api/channels/current-channel` | Get current channel info |
| | `POST /api/channels/room-msgs` | Get room messages |
| | `POST /api/channels/send-room-msg` | Send a message to the room |
| | `POST /api/channels/me` | Get the current user profile |
| **Chatbot** | `POST /api/chatbot/start` | Start AI replies in a channel |
| | `POST /api/chatbot/stop` | Stop the chatbot loop |
| **Timer** | `POST /api/channel/start-timer` | Start a pomodoro cycle for a channel |
| **Notifications** | `POST /api/notifications` | Get notifications (`size`, `page`) |
| | `POST /api/notifications/actionable` | Get actionable notifications |

---

## Key Concepts

### The Clubhouse "agent"

`src/helper/agent.ts` is the foundation of the bot. It wraps `fetch` and **mimics the Clubhouse iOS app** — sending the same `User-Agent`, `CH-*` headers (app version, build, device ID, locale), and `Token` authorization the mobile client sends to `https://www.clubhouseapi.com/api`.

`ClubApiService` (`src/services/club-api.service.ts`) builds typed, safe wrappers on top of it (join/leave channels, send messages, search users, notifications, etc.). An optional per-call `token` override lets a single request act as a specific stored identity without mutating shared state.

### API-key auth

The server validates the `API_KEY` env var at boot. Requests to protected endpoints must send it in the `x-api-key` header; a missing/mismatched key returns `401`. The middleware is unit-tested and currently guards `/swagger.json` — the `/api` router can be protected by enabling `requireApiKey` in `src/server.ts`.

### Profile & token management

- `profile.json` holds the primary account credentials (loaded by `service-initializer.ts` at boot).
- `ValidToken` (MongoDB) lets you store **multiple tokens by name** and switch between them — e.g. `accept_invite` looks up a user's token by username before acting as them.

### The chatbot

- Polls a channel every **15 seconds**.
- Only reacts to messages that start with `#` (the "question" convention).
- Sends the question to OpenAI (`gpt-4o` by default), instructed to reply briefly (< 270 chars), in the same language, and to protect "Ehsan" as confidential.
- Replies are prefixed with `{user_name} Jan,` and posted back to the room.
- A message cache (`utils/messageCache.ts`, 24h TTL) prevents duplicate replies.

### Auto invite-to-stage

On join, the channel service watches room messages. If a message from a user on `INVITE_ALLOW_LIST` matches an invite keyword (e.g. `invite`, `stage`, `speaker`, `استیج`, `اجازه`), that user is invited to the speakers. Per-session dedupe prevents repeat invites. Feature is disabled when `INVITE_ALLOW_LIST` is empty.

### The ping loop

When you join a room, a background loop (`utils/pingManager.ts`) sends an `activePing` every **3 minutes** so the account stays marked as active. Leaving the room — or a `should_leave` signal from Clubhouse — stops it.

### The pomodoro timer

`TimerService` runs a **45-minute focus / 15-minute break** cycle per channel. An hourly check starts the cycle at the top of each hour and consecutive timers chain without overlapping intervals.

---

## Common Tasks

All examples assume the API is running locally on port 4000.

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

### Get notifications

```bash
curl -X POST http://localhost:4000/api/notifications \
  -H "Content-Type: application/json" \
  -d '{ "size": 20, "page": 1 }'
```

### Quality checks

```bash
pnpm run typecheck   # strict type checking
pnpm run lint        # ESLint
pnpm test            # Vitest suite
pnpm run build       # compile to dist/
```

---

## Troubleshooting

| Problem | Likely cause / fix |
| --- | --- |
| Server exits immediately with "Missing required environment variable(s)" | One of `API_KEY`, `OPENAI_API_KEY`, `MONGODB_URL`, `AGORA_KEY`, `PUBNUB_PUB_KEY`, `PUBNUB_SUB_KEY` is unset. See `.env.example`. |
| `Server running at http://localhost:4000` never appears | MongoDB isn't running. Start it (`mongod`) or fix `MONGODB_URL`. |
| `Port 4000 is already in use` | Another process owns the port. Kill it or set `PORT` to a different value. |
| `Agent and profile not configured` | `profile.json` is missing/invalid. Provide a valid Clubhouse profile. |
| `Access denied. Invalid API key.` | Your `x-api-key` header is wrong or stale. |
| Chatbot doesn't reply | Check `OPENAI_API_KEY`, that the channel is valid, and that messages start with `#`. |
| Auto-invite doesn't fire | Ensure `INVITE_ALLOW_LIST` is set and includes the requesting user's ID. |
| `Failed to connect to MongoDB` | Confirm the DB is reachable; the URL is normalized to `127.0.0.1` (avoid `localhost`). |
| Logs seem quiet | Set `LOG_LEVEL=debug` in `.env` for verbose output; files land in `logs/`. |

---

## Contributing

Please read [`contributing.md`](./contributing.md) — it defines the mandatory engineering standards for this repo (strict TypeScript, incremental refactoring, model-first migration order, and CI gates). Open issues and PRs are welcome.
