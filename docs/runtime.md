# Runtime

This document describes the runtime processes that actually run in the current implementation, derived from [`src/server.ts`](../src/server.ts), [`src/core/bots/bot-manager.ts`](../src/core/bots/bot-manager.ts), and [`src/core/events/event-processor.ts`](../src/core/events/event-processor.ts).

## Process Model

Production runs **one application process**: `node dist/server.js` (launched via `start.sh` → `pnpm start` when `NODE_ENV=production`).

The single process owns everything:

- the Express HTTP server,
- the `BotManager` runtime (bot runtimes, per-room sync and active-ping timers),
- event processing (`EventProcessor` draining the Mongo event store),
- all in-memory state (event bus, AI cooldown store, message rate limiter buckets).

There is **no separate worker process**. The standalone worker entrypoint [`src/worker.ts`](../src/worker.ts) is future infrastructure: it logs a warning ("Worker entry is future infrastructure and is NOT active in the MVP") and exits; it is never started by production. The `jobQueue`/`Scheduler` abstractions in [`src/infrastructure/queue/`](../src/infrastructure/queue/) are likewise never started (see [limitations.md](./limitations.md)).

## Boot Sequence

```text
node dist/server.js
    ↓
dotenv.config() (loads .env in dev)
    ↓
NODE_ENV !== 'production' → DEBUG='*'
    ↓
getMissingEnvVars() → exit 1 if REQUIRED / PROD_REQUIRED vars missing
    ↓
connectDatabase() (Mongo, serverSelectionTimeoutMS 5000, family 4)
    ↓
tenantService.ensureDefaultTenant() (bootstrap from API_KEY)
    ↓
registerBuiltinAdapters() (Clubhouse)
    ↓
configureEventPipeline() (moderation → automation → usage stages; eventProcessor.start)
    ↓
botManager.startAll() (restart bots whose status is 'active')
    ↓
app.listen(PORT)  — EADDRINUSE → log + exit 1
```

## BotManager

`BotManager` (in [`src/core/bots/bot-manager.ts`](../src/core/bots/bot-manager.ts)) owns the live bot runtimes.

State:

- `runtimes: Map<botId, RuntimeEntry>` — one entry per started bot: `{ tenantId, bot, adapter, botUserId, externalAccountName }`.
- `roomTimers: Map<"{botId}:{roomId}", { sync, ping }>` — per-room timers.
- `startup: Map<botId, StartupEntry>` — lifecycle state with a per-bot **generation counter** to serialize start/stop races.

Per-room loops (while the bot is `active`):

- **Sync loop** — every `ROOM_SYNC_INTERVAL_MS` (default 15000): `syncRoom` fetches messages from Clubhouse, deduplicates, tracks members, and publishes normalized events (see [events.md](./events.md)).
- **Active-ping loop** — every `ACTIVE_PING_INTERVAL_MS` (default 180000, clamped 120000–300000): calls the Clubhouse `active_ping` endpoint for the room to keep presence alive (see [platforms/clubhouse.md](./platforms/clubhouse.md)).

`syncRoom`/`pingRoom`/`inviteSpeaker` only operate on rooms with status `'active'` and matching `tenantId`.

On an **authentication failure** from the platform (HTTP 401/403 during ping or sync), `handleAuthFailure` marks the credential invalid, clears timers, deletes the runtime, sets the bot status to `error`, and marks all active/joining rooms `error`. Transient errors keep the runtime alive (see [bot-lifecycle.md](./bot-lifecycle.md)).

## Event Processing

`EventProcessor` (in [`src/core/events/event-processor.ts`](../src/core/events/event-processor.ts)) runs **in the same process**:

- On `start()`, subscribes to all events on the in-memory `EventBus` and kicks off a background `recover()` drain.
- Every published event is claimed atomically from the Mongo `EventStore` (`pending → processing`) and routed through the fixed stage pipeline:
  1. **moderation** — gates `message.created` by room settings (see [moderation.md](./moderation.md)).
  2. **automation** — evaluates automation rules for `user.joined` / `message.created` / `speaker.requested` (see [events.md](./events.md)).
  3. **usage** — records platform-observed usage events (see [usage.md](./usage.md)).
- After the stages, the event is marked `processed` (or `failed`/retryable on stage failure).

The processor uses the same lease/claim mechanics as the action idempotency store (see [idempotency.md](./idempotency.md)): a `claimId` ownership token must be presented to mark processed/failed, so a stale owner can never mutate a successor's claim.

## Graceful Shutdown

On `SIGINT`/`SIGTERM`:

1. `botManager.stopAll()` — clears all room timers and deletes all bot runtimes.
2. `server.close()` — stops accepting new connections.
3. Process exits `0`.

Other process-level handlers:

- `uncaughtException` → logged, then `process.exit(1)`.
- `unhandledRejection` → logged only (does not exit).

## In-Memory State (single-process scope)

Because everything runs in one process, the following state is in-memory and resets on restart:

- `EventBus` (in-memory pub/sub; durable events remain in Mongo).
- AI cooldown store (`InMemoryAiCooldownStore`).
- Message rate limiter buckets (`InMemoryMessageRateLimiter`).

A restart drains incomplete events from Mongo via the event processor's recovery pass, but in-memory cooldown/rate-limit state is lost.

## Health

`GET /health` returns `{ "status": "ok", "uptime": <seconds> }`. It is used by the Docker `HEALTHCHECK` (see [deployment.md](./deployment.md)).
