# Architecture

This document describes the architecture of the repository **as it exists today**. It is derived from the current source code only. Historical or planned architecture is intentionally not described here; see [limitations.md](./limitations.md) for explicit notes about what is *not* part of the current runtime.

## System Overview

`clubhouse-full-api` is a **single-process MVP** HTTP API that operates Clubhouse user accounts programmatically.

A tenant provisions one or more `Bot` records. Each bot is a normal Clubhouse user account whose credentials (an auth token and optional device id) are stored encrypted. The bot is started through the API; at runtime the process joins the bot into configured Clubhouse rooms, polls room messages, applies moderation, runs automation rules (welcome messages, speaker invites, AI answers), emits event and usage records, and periodically sends Clubhouse `active_ping` requests to keep the room presence alive.

The application does **not** use a separate worker/queue runtime in production. All runtime work (bot room loops, active ping timers, event processing) happens inside the single API process. A standalone worker entrypoint exists in the source tree but is not wired into any runtime (`src/worker.ts` logs a warning and exits).

## Runtime Architecture

The production entrypoint is [`src/server.ts`](../src/server.ts). The boot sequence is:

```text
Process startup (node dist/server.js)
    ↓
dotenv loading + DEBUG enable (non-production)
    ↓
Environment validation (getMissingEnvVars → exit 1 on missing)
    ↓
MongoDB connection (src/config/db/db.ts)
    ↓
ensureDefaultTenant (bootstrap tenant from API_KEY, idempotent)
    ↓
registerBuiltinAdapters (Clubhouse adapter factory)
    ↓
configureEventPipeline (moderation → automation → usage stages + eventProcessor.start)
    ↓
botManager.startAll (restart every bot with status 'active')
    ↓
HTTP server listen (PORT, default 4000)
```

After boot, the process runs three concurrent responsibilities on the same event loop:

1. **HTTP API** — Express server serving the `/v1` routes, `/health`, `/openapi.json` and Swagger UI at `/api-docs`.
2. **Bot runtime** — `BotManager` owns one runtime per started bot, each with per-room sync and active-ping timers.
3. **Event processing** — `EventProcessor` drains the Mongo-backed event store through the stage pipeline (moderation → automation → usage).

Graceful shutdown on `SIGINT`/`SIGTERM` calls `botManager.stopAll()` (stops all room timers and marks runtimes stopped) and then closes the HTTP server.

## Layer Responsibilities

### API (`src/api/`, `src/middlewares/`)

- Express router at `/v1` ([`src/api/routes/v1.routes.ts`](../src/api/routes/v1.routes.ts)) with 23 operations.
- Authentication (`x-api-key` → tenant resolution), tenant context guard, and tenant-scoped resource loaders (`requireBot`, `requireRoom`, `requireCredential`).
- Joi body validation and controllers that return `{ data: ... }` responses.
- OpenAPI 3.0 spec built programmatically ([`src/api/openapi/v1.openapi.ts`](../src/api/openapi/v1.openapi.ts)) and served at `/openapi.json`.
- Global error handler ([`src/middlewares/error-handler.ts`](../src/middlewares/error-handler.ts)).
- A legacy `src/middlewares/api-key.ts` middleware exists but is **not imported** by any route (see [limitations.md](./limitations.md)).

### Core (`src/core/`)

The domain layer. Sub-layers:

- **tenants** — tenant entity and API-key lookup; top-level auth boundary.
- **bots** — `Bot` entity, `BotRepository`, `BotService`, and `BotManager` (runtime ownership).
- **rooms** — `BotRoom` entity, `RoomRepository`, `RoomService` (join/leave/sync), member tracking.
- **credentials** — encrypted credential lifecycle and AES-256-GCM encryption.
- **events** — in-memory `EventBus`, Mongo-backed `EventStore`, `EventProcessor`, action idempotency.
- **automation** — rule engine and three wired rules (welcome, speaker-request, ai-answer).
- **moderation** — moderation stage and in-memory message rate limiter.
- **usage** — append-only usage events and analytics summary.
- **ai** — AI trigger detection, cooldown, provider abstraction (OpenAI + OpenAI-compatible).

### Platform (`src/platforms/`)

- `adapter.ts` defines the `CommunityPlatformAdapter` contract and the adapter factory registry.
- `register.ts` registers built-in adapters (Clubhouse only).
- `clubhouse/` implements the Clubhouse adapter, HTTP agent, private-API client (`ClubApiService`), mappers, and error classification.

### Infrastructure (`src/infrastructure/`)

- `deduplication/` — Mongo-backed message deduplicator (`MongoMessageDeduplicator`).
- `queue/` — an in-memory `JobQueue` abstraction. **Not used by the production runtime** (see [limitations.md](./limitations.md)).

### Persistence (`src/models/`)

Mongoose models for all Mongo collections (see [domain-model.md](./domain-model.md)).

### Configuration & boot (`src/config/`)

- `environment.ts` — required/production-required environment variables.
- `db/db.ts` — Mongo connection.
- `constants.ts` — HTTP/Clubhouse constants.

## Dependency Direction

The actual import direction is:

```mermaid
flowchart TD
    Server[src/server.ts] --> App[src/app.ts]
    Server --> Startup[src/core/startup.ts]
    App --> V1Router[src/api/routes/v1.routes.ts]
    V1Router --> Middleware[src/api/middleware]
    V1Router --> Controllers[src/api/controllers]
    Controllers --> Core[src/core/*]
    Core --> Platform[src/platforms/adapter.ts]
    Core --> Infrastructure[src/infrastructure/*]
    Core --> Models[src/models/*]
    Platform --> Clubhouse[src/platforms/clubhouse/*]
    Startup --> EventProcessor[src/core/events/event-processor.ts]
    Startup --> Stages[src/core/automation | moderation | usage]
```

Key observations that hold in the current code:

- The **API layer depends on the core services** (bots, rooms, credentials, usage). Controllers never touch models directly.
- **Core depends on the platform adapter contract** (`src/platforms/adapter.ts`) — `BotService.createAdapter` builds an adapter from a decrypted credential, and `BotManager` and `RoomService` consume the contract. Only `BotService` and the runtime layers see the concrete adapter.
- **Core depends on infrastructure** (message deduplicator) and on **models** (repositories).
- The **event pipeline is wired in `src/core/startup.ts`**, called from `server.ts`; the API never imports the pipeline.
- `src/worker.ts` is standalone and imports nothing but the logger.

The code does **not** enforce a strict layering rule (e.g. no ESLint import-boundary plugin); the direction above is what the current imports actually look like.

## Process Model

Production runs **one application process** (`node dist/server.js`, via `start.sh` → `pnpm start`). That single process owns:

- the HTTP server,
- the `BotManager` runtime (room sync loops and active-ping timers),
- event processing (`EventProcessor`),
- all in-memory state (EventBus, cooldown store, rate limiter buckets).

The worker entrypoint (`src/worker.ts`, `pnpm start:worker`) is **future infrastructure** and is not part of the production runtime. See [runtime.md](./runtime.md) and [deployment.md](./deployment.md).
