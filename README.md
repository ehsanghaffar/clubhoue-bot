# Clubhouse Bot API

A TypeScript + Express server that operates **Clubhouse user accounts** programmatically for multi-tenant bot automation. Bots are configured via MongoDB credentials, join rooms, sync messages, run automation rules (welcome, AI Q&A, speaker invites), and expose a tenant-scoped REST API at **`/v1`**.

> **Note:** This project calls a **private, undocumented Clubhouse API**. Use it at your own risk and in accordance with Clubhouse's terms of service.

---

## Features

- 🤖 **Per-bot AI** — mention-triggered Q&A via configurable providers (`openai`, `openai-compatible`).
- 🎙️ **Room automation** — join/leave, message sync, welcome messages, speaker invites.
- 🔄 **Active ping** — keep-alive using Clubhouse `externalRoomId` immediately after join, then every 2–5 minutes.
- 🔑 **Encrypted credentials** — per-bot Clubhouse session tokens stored encrypted in MongoDB.
- 🏢 **Multi-tenant** — API key resolves to a tenant; all resources are tenant-scoped.
- 📚 **OpenAPI** — `/openapi.json` + Swagger UI at `/api-docs`.

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Language | TypeScript (strict, ES2022, ESM) |
| Runtime | Node.js 22 |
| Web framework | Express 5 |
| Database | MongoDB via Mongoose 9 |
| AI | OpenAI SDK (`gpt-4o-mini`, configurable) |
| Auth | API key (`x-api-key` header) + `express-rate-limit` |
| Validation | Joi |
| Docs | swagger-jsdoc + swagger-ui-express |
| Logging | Winston (JSON logs → `logs/`) |
| Testing | Vitest |
| Package manager | pnpm 10 |
| Containerization | Docker (multi-stage build) + docker-compose |
| CI | GitHub Actions (typecheck, lint, test, build, dependency audit) |

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

### 3. Run it

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

### 4. Open the docs

- Swagger UI → http://localhost:4000/api-docs
- OpenAPI JSON → http://localhost:4000/openapi.json

### Docker

The repo ships with a multi-stage `Dockerfile` (build + slim runtime, non-root user, healthcheck), a dev `docker-compose.yml` (app + MongoDB), and a production `docker-compose.prod.yml` (api + mongo — a single live runtime).

**Development**

```bash
docker compose up -d
```

- App: http://localhost:4000
- MongoDB container: `mongodb://club_database:27017/clubhouse` (host port `27020`)

**Production**

```bash
cp .env.example .env.production   # fill in real secrets, then:
docker compose -f docker-compose.prod.yml up -d --build
```

The production stack runs two services:

- `api` — serves the HTTP API on port `4000`; the ONLY live BotManager runtime (room loops, moderation, automation, AI), healthcheck on `/health`
- `mongo` — MongoDB 6, persistent volume

There is **no separate worker and no Redis** in the MVP: the worker (`src/worker.ts`) and Redis are future infrastructure (Scheduler → Queue → Worker) and are deliberately not deployed. Keys and credentials are injected at runtime via `.env.production` and are never baked into the image.

### CI

Every push and pull request runs the validation pipeline (spec §27) via `.github/workflows/ci.yml`:

```text
install → typecheck → lint → test → build → dependency audit
```

- `checks` job — typecheck, lint, test, build.
- `dependency-audit` job — `pnpm audit`; high-severity advisories are surfaced, **critical** vulnerabilities fail the run.

Configure branch protection on `main`/`develop` to require both jobs as status checks so that code failing these checks cannot be merged.

---

## Environment Variables

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `PORT` | No | `4000` | HTTP port the server listens on |
| `API_KEY` | **Yes** | — | Key checked against the `x-api-key` header; server won't boot without it |
| `MONGODB_URL` | **Yes** | `mongodb://127.0.0.1:27017/clubhouse` | MongoDB connection string (`localhost` is normalized to `127.0.0.1`) |
| `OPENAI_API_KEY` | **Yes** | — | Default AI provider key |
| `AI_PROVIDER` | No | `openai` | `openai` or `openai-compatible` |
| `AI_BASE_URL` | No | — | Base URL for openai-compatible providers |
| `AI_MODEL` | No | — | Override model for compatible providers |
| `ACTIVE_PING_INTERVAL_MS` | No | `180000` | Keep-alive interval (120000–300000) |
| `ROOM_SYNC_INTERVAL_MS` | No | `15000` | Message sync interval |
| `AGORA_KEY` | **Yes** | — | Agora (voice) key used by the client metadata |
| `PUBNUB_PUB_KEY` | **Yes** | — | PubNub publish key |
| `PUBNUB_SUB_KEY` | **Yes** | — | PubNub subscribe key |
| `NODE_ENV` | No | — | `development` / `production` (swagger spec paths, error verbosity, console logs, `DEBUG=*`) |
| `LOG_LEVEL` | No | `info` | Winston log level |
| `INVITE_ALLOW_LIST` | No | — | Comma-separated Clubhouse user IDs allowed to be auto-invited to the stage |
| `OPENAI_MODEL` | No | `gpt-4o-mini` | Chatbot model |
| `OPENAI_MAX_TOKENS` | No | `150` | Max tokens per chatbot reply |
| `OPENAI_TEMPERATURE` | No | `0.4` | Chatbot sampling temperature |
| `CREDENTIAL_ENCRYPTION_KEY` | **Prod** | — | AES-256-GCM key for encrypted credentials. **Required in production** (startup fails without it; no dev-key fallback). Losing it makes encrypted credentials unrecoverable |
| `SALT` | No | `10` | Reserved for password hashing |

---

## Documentation

The `docs/` folder describes the implemented architecture:

| Doc | Covers |
| --- | --- |
| [`docs/architecture.md`](docs/architecture.md) | System layering, modules, data flow |
| [`docs/mvp-roadmap.md`](docs/mvp-roadmap.md) | Migration status + Definition of Done |
| [`docs/api.md`](docs/api.md) | `/v1` product API |
| [`docs/bot-lifecycle.md`](docs/bot-lifecycle.md) | Bot start/run/stop lifecycle |
| [`docs/automation.md`](docs/automation.md) | Event/automation pipeline and rules |
| [`docs/ai.md`](docs/ai.md) | AI provider, triggers, cooldown |
| [`docs/platforms.md`](docs/platforms.md) | Platform adapter contract + Clubhouse |
| [`docs/deployment.md`](docs/deployment.md) | Local, Docker, worker, CI |
| [`docs/security.md`](docs/security.md) | Auth, tenant isolation, encryption |

---

## Project Structure

```
cl-api/
├── src/
│   ├── server.ts               # Bootstrap: DB, BotManager, event processor
│   ├── app.ts                  # Express app: /v1, /health, /openapi.json
│   ├── api/                    # HTTP layer (routes, controllers, middleware, OpenAPI)
│   ├── core/                   # Domain: bots, rooms, events, AI, automation, moderation
│   ├── platforms/clubhouse/    # Clubhouse adapter + API service
│   ├── models/                 # Mongoose schemas
│   └── workers/                # Background job handlers
├── tests/                      # Vitest suite
├── docs/                       # Architecture & API documentation
└── docker-compose*.yml         # Dev & prod containers
```

---

## API Overview

All routes are under **`/v1`**. See [`docs/api.md`](docs/api.md) and `/openapi.json`.

| Group | Endpoint | Description |
| --- | --- | --- |
| **Bots** | `POST /v1/bots` | Create a bot |
| | `POST /v1/bots/:botId/start` / `stop` | Start/stop runtime |
| **Credentials** | `POST /v1/bots/:botId/credentials` | Add Clubhouse session token |
| **Rooms** | `POST /v1/bots/:botId/rooms/:externalRoomId/join` | Join room |
| | `POST /v1/bots/:botId/rooms/:externalRoomId/messages` | Send message |
| **Users** | `GET /v1/bots/:botId/me` | Bot profile |

### `/v1` (public API)

The modern, tenant-scoped API is mounted under `/v1`. Every route requires a valid API key (`x-api-key` header) that resolves to an **active tenant**, and all resource access is scoped to that tenant — a bot, room, or credential owned by another tenant returns `404`. Responses use a `{ "data": ... }` envelope; create endpoints return `201`, deletes return `204`, and errors return `{ "error": { "type", "message" } }`. A global rate limit of **100 requests/minute** applies. Credential tokens are encrypted at rest and **never returned** by the API.

| Group | Endpoint | Description |
| --- | --- | --- |
| **Bots** | `POST /v1/bots` | Create a bot (`name`, `platform: "clubhouse"`, optional `aiConfig`, `personality`, `welcomeMessage`) |
| | `GET /v1/bots` | List the tenant's bots |
| | `GET /v1/bots/:botId` | Get one bot |
| | `PATCH /v1/bots/:botId` | Update a bot (partial `aiConfig` is merged, not replaced) |
| | `DELETE /v1/bots/:botId` | Stop and delete a bot |
| | `POST /v1/bots/:botId/start` | Start the bot (needs an active credential; otherwise `400`) |
| | `POST /v1/bots/:botId/stop` | Stop the bot |
| **Credentials** | `POST /v1/bots/:botId/credentials` | Add a platform token (encrypted at rest) |
| | `GET /v1/bots/:botId/credentials` | List credentials (ciphertext never exposed) |
| | `DELETE /v1/bots/:botId/credentials/:credentialId` | Remove a credential |
| **Rooms** | `POST /v1/bots/:botId/rooms` | Configure a room (`externalRoomId`, optional `settings`) |
| | `GET /v1/bots/:botId/rooms` | List a bot's rooms |
| | `GET /v1/bots/:botId/rooms/:externalRoomId` | Get one room |
| | `POST /v1/bots/:botId/rooms/:externalRoomId/join` | Join the room |
| | `POST /v1/bots/:botId/rooms/:externalRoomId/leave` | Leave the room |
| **Messages** | `POST /v1/bots/:botId/rooms/:externalRoomId/messages` | Send a message |
| | `GET /v1/bots/:botId/rooms/:externalRoomId/messages` | List room messages |
| | `POST /v1/bots/:botId/rooms/:externalRoomId/accept-invite` | Accept speaker invite |
| **Users** | `POST /v1/bots/:botId/users/search` | Search users (migrated from `search_users`) |
| | `GET /v1/bots/:botId/users/:userId` | Get a user by id (migrated from `get_user`) |
| | `GET /v1/bots/:botId/me` | The bot's own profile (migrated from `channels/me`) |
| **Usage** | `GET /v1/bots/:botId/usage` | Per-bot usage + analytics summary |
| | `GET /v1/bots/:botId/events` | Recent usage events (`?limit=`, default 50, max 200) |

---

## Key Concepts

### Clubhouse platform layer

`src/platforms/clubhouse/` wraps Clubhouse's private HTTP API. `ClubApiService` provides typed methods; `ClubhouseAdapter` implements the platform contract used by `BotManager`. Errors are classified via `ClubhouseApiError` (auth failure, retryable, rate-limited).

### Bot identity

Each bot is a normal Clubhouse user account. Identity for self-message filtering and mention detection uses **`externalAccountId`** and **`externalAccountName`** from the active credential — never the bot display `name`.

### Active ping & sync

When a bot joins a room, `BotManager` sends an immediate `activePing`, then repeats every `ACTIVE_PING_INTERVAL_MS` (default 3 min). The join-time ping retries with backoff (`JOIN_PING_RETRY_ATTEMPTS`, `JOIN_PING_RETRY_BASE_DELAY_MS`) on transient/network failures before falling back to the interval. Message sync runs on a separate interval per `botId:roomId`. Auth failures mark credentials invalid and stop room timers.

### AI & automation

Messages flow through the event processor (moderation → automation → usage). AI replies use `MentionDetector`, per-user cooldown (`tenantId+botId+roomId+userId`), and configurable providers via `AI_PROVIDER`.

---

## Common Tasks

All examples use the tenant API key in `x-api-key`.

### Create a bot and add credentials

```bash
curl -X POST http://localhost:4000/v1/bots \
  -H "x-api-key: $API_KEY" -H "Content-Type: application/json" \
  -d '{ "name": "My Bot", "platform": "clubhouse" }'

curl -X POST http://localhost:4000/v1/bots/<botId>/credentials \
  -H "x-api-key: $API_KEY" -H "Content-Type: application/json" \
  -d '{ "token": "<clubhouse-token>", "externalAccountId": "123", "externalAccountName": "mybot" }'
```

### Start bot and join a room

```bash
curl -X POST http://localhost:4000/v1/bots/<botId>/start -H "x-api-key: $API_KEY"

curl -X POST http://localhost:4000/v1/bots/<botId>/rooms \
  -H "x-api-key: $API_KEY" -H "Content-Type: application/json" \
  -d '{ "externalRoomId": "M84V9RyJ" }'

curl -X POST http://localhost:4000/v1/bots/<botId>/rooms/M84V9RyJ/join -H "x-api-key: $API_KEY"
```

### Quality checks

```bash
pnpm run typecheck   # strict type checking
pnpm run lint        # ESLint
pnpm test            # Vitest suite
pnpm run build       # compile to dist/
```

Test coverage includes unit tests for the core services (bots, rooms,
credentials, usage, automation rules, message deduplication, credential
encryption), API middleware (authorization, error handler, API key), the
automation pipeline end-to-end (event bus → processor → rules → actions →
usage), and the Clubhouse platform adapter using a mocked HTTP transport — no
tests depend on the live Clubhouse API.

---

## Troubleshooting

| Problem | Likely cause / fix |
| --- | --- |
| Server exits immediately with "Missing required environment variable(s)" | One of `API_KEY`, `OPENAI_API_KEY`, `MONGODB_URL`, `AGORA_KEY`, `PUBNUB_PUB_KEY`, `PUBNUB_SUB_KEY` is unset. See `.env.example`. |
| `Server running at http://localhost:4000` never appears | MongoDB isn't running. Start it (`mongod`) or fix `MONGODB_URL`. |
| `Port 4000 is already in use` | Another process owns the port. Kill it or set `PORT` to a different value. |
| `Agent and profile not configured` | No active credential for the bot. Add one via `POST /v1/bots/:botId/credentials`. |
| `Access denied. Invalid API key.` | Your `x-api-key` header is wrong or stale. |
| Bot doesn't respond to mentions | Check `OPENAI_API_KEY`, `AI_PROVIDER`, and that the credential's `externalAccountId` matches the Clubhouse account. |
| `Failed to connect to MongoDB` | Confirm the DB is reachable; the URL is normalized to `127.0.0.1` (avoid `localhost`). |
| Logs seem quiet | Set `LOG_LEVEL=debug` in `.env` for verbose output; files land in `logs/`. |

---

## Contributing

Please read [`contributing.md`](./contributing.md) — it defines the mandatory engineering standards for this repo (strict TypeScript, incremental refactoring, model-first migration order, and CI gates). Open issues and PRs are welcome.
