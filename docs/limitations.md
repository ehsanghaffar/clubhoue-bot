# Limitations

This document records the real limitations of the current implementation. Each item is verified against source code; none are hypothetical future gaps.

## Single-process runtime

- The application runs as a **single Node process** that owns the HTTP server, the BotManager (room loops, active-ping timers), and event processing ([runtime.md](./runtime.md)).
- There is **no horizontal scaling** and no separation between API and worker.
- [`src/worker.ts`](../src/worker.ts) (a standalone worker entrypoint with `Scheduler`/`Queue`/`Worker` infrastructure under `src/infrastructure/queue/`) exists but is **never started** by any runtime path: `server.ts` never imports it, `package.json` has `start:worker`/`start:dev:worker` scripts, and the production Docker image only runs `server.js`. The worker is **future infrastructure, not part of the current runtime**.
- All in-process timers are lost on restart; state is rebuilt by the boot-time `startAll()` bootstrap query (which re-runs `active` bots and re-arms room timers).

## In-memory state (non-durable, per-process)

These components are intentionally in-memory and reset on process restart (or drift across multiple processes if ever run):

- **AI cooldown store** (`InMemoryAiCooldownStore`) — per `tenant:bot:room:user` cooldown state ([ai.md](./ai.md)).
- **Message rate limiter** (`InMemoryMessageRateLimiter`) — fixed-window per room+user ([moderation.md](./moderation.md)).
- The message dedup, event claim, and action-idempotency stores **are** Mongo-backed (durable), but their in-memory counterparts exist for tests.

## Clubhouse integration relies on private platform behavior

- The Clubhouse adapter calls `https://www.clubhouseapi.com/api` — an **undocumented/private** API (not an official public API). The integration is reverse-engineered and may break when Clubhouse changes its API.
- There is no official Clubhouse "bot" concept — the bot is a **normal Clubhouse user account operated programmatically** ([platforms/clubhouse.md](./platforms/clubhouse.md)).
- The agent loop depends on the platform delivering channel events over its own infrastructure (the codebase references AGORA/PubNub keys) — see below.

## Required-but-unused environment variables

- `AGORA_KEY`, `PUBNUB_PUB_KEY`, `PUBNUB_SUB_KEY` are **required** for boot (in `REQUIRED_ENV_VARS`) but are **not read anywhere** in `src/` at runtime. The app fails to start without them, yet they serve no current runtime function.
- `SALT` appears in `.env.example` but is **never read** in `src/`.
- These are likely residuals of the platform-communication layer; they are currently dead configuration requirements ([configuration.md](./configuration.md)).

## No Discord or other platforms

- Only `'clubhouse'` is registered as a platform adapter. The adapter registry contains a comment "Discord will be added later", but **Discord is not implemented** ([architecture.md](./architecture.md)).

## Usage telemetry without billing

- Usage is recorded as append-only `UsageEvent`s, but there is **no billing**, no quotas enforcement, and no pricing logic anywhere in the codebase ([usage.md](./usage.md)).

## Usage summary hardcoded zeros

- `MongoUsageRepository.summarizeByBotAndTenant` hardcodes `users: 0`, `rooms: 0`, `errors: 0` in the summary it returns. The `AnalyticsService.summarizeBot` layer recomputes real `rooms` and `users` counts from `BotRoom`/`RoomMember`, but the repository-level summary itself does not ([usage.md](./usage.md)).

## Dead constants / unused legacy code

- `MESSAGE_LIMITS.MAX_RESPONSE_LENGTH = 270` in [`src/config/constants.ts`](../src/config/constants.ts) is **not imported or used** anywhere; the effective response-length limit comes from `aiConfig.maxResponseLength` (default 280).
- `src/middlewares/api-key.ts` (legacy `requireApiKey`) is **unused** — authentication is via `src/api/middleware/authentication.ts`.
- `src/types/models.ts` (`IUser`, `IRoomMessage`, …) is legacy and unused by the current domain types.
- `SECURITY.md` at the repo root is **GitHub boilerplate placeholder** (generic "Supported Versions" table and un-filled vulnerability-reporting section), not a real security policy.

## Test-fake divergence

- The in-memory bot repository used by tests defaults `triggerMode` to `'question'`, while the **production default is `'mention'`** (`DEFAULT_TRIGGER_MODE`). Tests that use the fake therefore exercise a different default than production ([testing.md](./testing.md)).

## Platform-specific constraints

- Clubhouse speaker invitations require an `INVITE_ALLOW_LIST` allow-list for auto-invite; guests outside the allow-list are never auto-invited ([platforms/clubhouse.md](./platforms/clubhouse.md)).
- `active_ping` runs only for rooms in `active` status and only while the bot runtime is alive ([runtime.md](./runtime.md)).

## No metrics / tracing

- There is no metrics or distributed-tracing system. Observability is limited to `/health`, the Winston file+console logger, and the error handler ([runtime.md](./runtime.md), [error-handling.md](./error-handling.md)).
