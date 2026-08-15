# clubhouse-full-api

![Lines of Code](https://img.shields.io/badge/Lines%20of%20Code-15641-orange)

```
Language                 Files       Lines     Blank     Comment        Code
----------------------------------------------------------------------------
TypeScript                 122        9757      1050        1578        7129
YAML                         5        5518      1187          42        4289
TypeScript (Test)           28        5144       602         319        4223
----------------------------------------------------------------------------
Total                      155       20419      2839        1939       15641
----------------------------------------------------------------------------
```

A **Clubhouse bot platform** — a single-process Node/TypeScript service that operates Clubhouse user accounts programmatically as bots. It exposes a tenant-scoped REST API (`/v1`) for managing bots, their Clubhouse credentials, and the rooms they join, and it runs those bots at runtime: joining rooms, syncing messages, responding via AI, automating welcome/speaker actions, and recording usage telemetry.

> This documentation was generated from the current source code. The repository had no prior documentation; everything under `docs/` was reverse-engineered from the implementation (see the [Documentation](#documentation) section).

---

## What It Is

A multi-tenant API + runtime for Clubhouse bots:

- **Multi-tenant**: every `/v1` request is authenticated with an `x-api-key` and scoped to a tenant.
- **Bots**: each bot is a normal Clubhouse user account operated programmatically (there is no Clubhouse-native bot concept).
- **Runtime**: the same process that serves HTTP also runs the bots — joining rooms, polling messages, sending active pings, and processing events.
- **AI**: bots can respond to messages via an OpenAI (or OpenAI-compatible) chat-completion provider, gated by trigger mode, moderation, and per-user cooldowns.

## Current Capabilities

- Full CRUD for bots (`/v1/bots`), with start/stop lifecycle.
- Credential management with AES-256-GCM encryption at rest.
- Room management: join, leave, fetch messages, accept speaker invites.
- Runtime bot loops: per-room message sync + active ping, with automatic resume of `active` bots at boot.
- Durable, idempotent event processing (moderation → automation → usage stages).
- Automation rules: welcome message, speaker-invite requests, and AI answers.
- AI responses (mention/prefix/keyword/question trigger modes; manual is reserved but never responds).
- Usage telemetry (`UsageEvent`) with a per-bot summary API.
- Swagger UI at `/api-docs` and OpenAPI JSON at `/openapi.json`.
- Docker-based production deployment (single API + MongoDB).

## Architecture Overview

Single-process design:

```text
HTTP (Express, /v1)
        ↓
  Authentication (x-api-key → tenant)
        ↓
  Controllers → Services (tenant-scoped repos)
        ↓
  BotManager (per-bot runtimes, room loops, active ping)
        ↓
  Clubhouse adapter → private Clubhouse API
        ↓
  Event pipeline (moderation → automation → usage)
```

There is **no worker process** in the current runtime: `src/worker.ts` is future infrastructure and is never started. See [docs/architecture.md](docs/architecture.md) and [docs/runtime.md](docs/runtime.md).

## Key Features

- [Bot lifecycle](docs/bot-lifecycle.md) — created → starting → active → stopping → stopped → error, with generation-based race protection.
- [Room lifecycle](docs/domain-model.md#room) and message sync with durable dedup.
- [Event system](docs/events.md) — durable `CommunityEvent` store + in-memory event bus, 3-stage pipeline, lease-based recovery.
- [Action idempotency](docs/idempotency.md) — atomic claims so welcome/speaker/AI actions are not duplicated.
- [AI](docs/ai.md) — trigger detection, moderation, cooldowns, provider selection, response generation.
- [Moderation](docs/moderation.md) — blocked users/keywords and per-room+user message rate limiting.
- [Usage telemetry](docs/usage.md) — append-only events; billing is **not** implemented.

## Requirements

- Node.js 22 (per the Docker image and CI)
- pnpm 10 (via corepack; `packageManager: pnpm@10.0.0`)
- MongoDB (local, or `docker compose up -d` for the dev database)

## Configuration

All configuration is via environment variables. Required at boot: `API_KEY`, `OPENAI_API_KEY`, `MONGODB_URL`, `AGORA_KEY`, `PUBNUB_PUB_KEY`, `PUBNUB_SUB_KEY`. `CREDENTIAL_ENCRYPTION_KEY` is required in production.

Copy `.env.example` to `.env` and fill in values. The full reference is in [docs/configuration.md](docs/configuration.md).

## Running Locally

```bash
# 1. Install dependencies
pnpm install

# 2. Start MongoDB (dev database on :27017)
docker compose up -d

# 3. Configure environment
cp .env.example .env        # set API_KEY, MONGODB_URL, OPENAI_API_KEY, etc.

# 4. Run the dev server (nodemon + tsx)
pnpm dev
```

The server listens on `http://localhost:4000` (default `PORT`).

> `docker compose up -d` only starts the `club_database` Mongo container — the app service is intentionally commented out for local development (see [docs/deployment.md](docs/deployment.md)).

## API

Base path: `/v1`. **All `/v1` routes require the `x-api-key` header** and are tenant-scoped.

| Area | Endpoints |
|---|---|
| Bots | `POST/GET /v1/bots`, `GET/PATCH/DELETE /v1/bots/:botId`, `POST /v1/bots/:botId/start`, `POST /v1/bots/:botId/stop` |
| Credentials | `POST/GET /v1/bots/:botId/credentials`, `DELETE /v1/bots/:botId/credentials/:credentialId` |
| Rooms | `POST/GET /v1/bots/:botId/rooms`, `GET/POST /v1/bots/:botId/rooms/:externalRoomId`, `POST /v1/bots/:botId/rooms/:externalRoomId/messages`, `POST /v1/bots/:botId/rooms/:externalRoomId/accept-invite` |
| Users | `POST /v1/bots/:botId/users/search`, `GET /v1/bots/:botId/users/:userId`, `GET /v1/bots/:botId/me` |
| Usage | `GET /v1/bots/:botId/usage`, `GET /v1/bots/:botId/events` |

Full endpoint reference (methods, params, request/response shapes, errors): [docs/api.md](docs/api.md).

### Example

```bash
curl -X POST http://localhost:4000/v1/bots \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "my-bot", "platform": "clubhouse"}'
```

```json
{ "data": { "id": "...", "name": "my-bot", "platform": "clubhouse", "status": "created", ... } }
```

## Swagger

- Swagger UI: `http://localhost:4000/api-docs`
- OpenAPI JSON: `http://localhost:4000/openapi.json`

The generated OpenAPI document is the authoritative API specification.

## Testing

```bash
pnpm test        # vitest run (28 files, 241 cases)
pnpm typecheck   # tsc --noEmit
pnpm lint        # eslint
pnpm build       # tsc
```

See [docs/testing.md](docs/testing.md) and [docs/ci.md](docs/ci.md).

## Docker / Deployment

```bash
cp .env.example .env.production   # fill in real secrets
docker compose -f docker-compose.prod.yml up -d --build
```

Runs two services: `api` (built from the multi-stage Dockerfile) and `mongo:6`. The image runs as the non-root `node` user, exposes port `4000`, and health-checks `/health`. See [docs/deployment.md](docs/deployment.md).

## Security

- `x-api-key` authentication with tenant resolution (suspended tenants are indistinguishable from invalid keys — both 401).
- Tenant isolation with 404 non-disclosure on cross-tenant access.
- Credential encryption with AES-256-GCM (`CREDENTIAL_ENCRYPTION_KEY` required in production).
- Rate limiting on `/v1` (100 req / 60 s → 429).
- Input validation via Joi.
- CI fails on critical dependency vulnerabilities.

See [docs/security.md](docs/security.md), [docs/security/authentication.md](docs/security/authentication.md), [docs/security/credentials.md](docs/security/credentials.md).

## Current Limitations

- Single-process runtime; the standalone worker is future infrastructure and never runs.
- AI cooldown and message rate limiting are in-memory (per-process).
- The Clubhouse integration relies on a private, undocumented API.
- `AGORA_KEY`/`PUBNUB_*` are required at boot but unused by the runtime.
- Billing is not implemented.
- Discord and other platforms are not implemented.

See [docs/limitations.md](docs/limitations.md).

## Project Structure

```text
src/
├── api/          # Express routes, controllers, middleware, OpenAPI spec
├── config/       # Environment validation, DB connection, constants
├── core/         # Domain logic: bots, rooms, credentials, events, AI, automation, moderation, usage, tenants
├── infrastructure/  # Deduplication (Mongo), queue (future/worker infra)
├── middlewares/  # Global error handler, validation
├── models/       # Mongoose models (9 collections)
├── platforms/    # Platform adapters (only clubhouse)
├── services/     # Legacy service layer
├── types/        # Legacy/config types
├── utils/        # Errors, logger
├── workers/      # Worker abstraction (future infra, not started)
├── server.ts     # Production entrypoint (single process)
└── worker.ts     # Standalone worker entrypoint (future infra; logs warning, exits)
```

## Documentation

- [docs/architecture.md](docs/architecture.md) — system overview, boot sequence, layers, process model
- [docs/domain-model.md](docs/domain-model.md) — all entities, fields, relationships, indexes
- [docs/api.md](docs/api.md) — full `/v1` endpoint reference
- [docs/configuration.md](docs/configuration.md) — environment variable reference
- [docs/bot-lifecycle.md](docs/bot-lifecycle.md) — bot statuses and start/stop behavior
- [docs/runtime.md](docs/runtime.md) — boot, room loops, active ping, shutdown
- [docs/events.md](docs/events.md) — event bus/store, pipeline, recovery
- [docs/idempotency.md](docs/idempotency.md) — action claim/lease mechanics
- [docs/ai.md](docs/ai.md) / [docs/ai/providers.md](docs/ai/providers.md) — AI flow and providers
- [docs/moderation.md](docs/moderation.md) — blocked users/keywords, rate limiting
- [docs/usage.md](docs/usage.md) — usage telemetry (no billing)
- [docs/database.md](docs/database.md) — MongoDB models, indexes, repositories
- [docs/testing.md](docs/testing.md) / [docs/ci.md](docs/ci.md) — tests and CI
- [docs/deployment.md](docs/deployment.md) — Docker and production deployment
- [docs/error-handling.md](docs/error-handling.md) — error classes and HTTP mapping
- [docs/security.md](docs/security.md) — security overview
- [docs/limitations.md](docs/limitations.md) — real limitations
- [docs/platforms/clubhouse.md](docs/platforms/clubhouse.md) — Clubhouse integration
- [docs/security/authentication.md](docs/security/authentication.md) / [docs/security/credentials.md](docs/security/credentials.md)
