# Bot Lifecycle

This document describes the bot runtime lifecycle as implemented in [`src/core/bots/bot-manager.ts`](../src/core/bots/bot-manager.ts) and [`src/core/bots/bot.service.ts`](../src/core/bots/bot.service.ts).

## Bot Document Status

The `Bot` document has a persisted `status` field with enum `'created' | 'starting' | 'active' | 'stopping' | 'stopped' | 'error'`.

| Status | Meaning | Set where |
| --- | --- | --- |
| `created` | Bot record created, runtime never started | `BotService.createBot` |
| `starting` | Runtime start in progress | transient internal `StartupEntry.status` (also the start flow may set the room statuses `joining`) |
| `active` | Runtime is running (timers armed) | `doStartBot` after all rooms prepared |
| `stopping` | Runtime stop in progress | transient internal `StartupEntry.status` |
| `stopped` | Runtime torn down | `doStopBot` |
| `error` | Start failed or auth failure at runtime | `startBot` catch / `handleAuthFailure` |

There are two status tracks in code:

- The **persisted `Bot.status`** (Mongo) — updated at the end of start (`active`), at stop (`stopped`), and on auth failure (`error`).
- The in-memory **`StartupEntry.status`** (`'stopped' | 'starting' | 'active' | 'stopping' | 'error'`) used to coordinate lifecycle races via a per-bot **generation counter**.

## Lifecycle Transitions

```text
created
   │  POST /v1/bots/:botId/start  (needs an active credential)
   ▼
starting ──► active   (rooms joined, timers armed)
   │                │
   │                │  POST /v1/bots/:botId/stop
   ▼                ▼
 error            stopping ──► stopped
   ▲                    │
   │   ping auth failure│
   └────────────────────┘  (runtime also torn down)
```

## Start (`POST /v1/bots/:botId/start` → `botManager.startBot`)

`startBot` is guarded so that concurrent start/stop calls serialize on a promise per bot (`StartupEntry.promise`), and a **generation counter** ensures a stop requested while a start is in flight wins the race (the in-flight start aborts at its next generation checkpoint and never builds a runtime).

`doStartBot` performs, in order:

1. Load the bot (`findByIdAndTenant`).
2. Load the active credential and build the platform adapter via `botService.createAdapter(bot)` — this **decrypts** the credential right before adapter construction (see [security/credentials.md](./security/credentials.md)).
3. Resolve `botUserId` from `credential.externalAccountId` (or a profile fetch fallback).
4. Create the runtime entry `{ tenantId, bot, adapter, botUserId, externalAccountName }`.
5. For each configured room:
   - Skip rooms with status `inactive` or `error`.
   - For rooms not yet `active`/`joining`: set status `'joining'`, then `roomService.join(room, adapter)` (calls `adapter.joinRoom`, sets room `active`, emits `room.joined` event). On failure, the room status is set to `'error'` and the loop continues (the bot still starts).
6. Arm per-room timers (`ensureRoomRuntime`) — sync timer and active-ping timer.
7. Set bot status `'active'`.

If no active credential exists, `createAdapter`/start fails and the bot transitions to `error` (the API returns 400 `"Bot has no active credential"` — see [api.md](./api.md)).

## Running

While `active`, the runtime holds:

- `runtimes: Map<botId, RuntimeEntry>` — the live adapter + bot context.
- `roomTimers: Map<"{botId}:{roomId}", { sync, ping }>` — per-room timers.

Room loops:
- **Sync timer** — every `ROOM_SYNC_INTERVAL_MS` (default 15000) calls `syncRoom` (fetch messages → dedup → moderation/automation/usage events; see [events.md](./events.md)).
- **Ping timer** — every `ACTIVE_PING_INTERVAL_MS` (default 180000, clamped 120000–300000) calls the Clubhouse `active_ping` to keep room presence alive (see [platforms/clubhouse.md](./platforms/clubhouse.md)).

## Stop (`POST /v1/bots/:botId/stop` → `botManager.stopBot`)

`doStopBot`:

1. Clears all room timers for the bot.
2. Deletes the runtime entry.
3. Sets bot status `'stopped'`.

Stop runs immediately (bumping the generation) so it wins over an in-flight start.

## Delete

`DELETE /v1/bots/:botId` calls `botManager.stopBot` first, then deletes the bot record (see [bots.controller.ts](../src/api/controllers/bots.controller.ts)).

## Auth Failure at Runtime (Credential Failure)

When an active-ping (or room sync) call returns a `ClubhouseApiError` classified as an **authentication failure** (HTTP 401/403 — see [platforms/clubhouse.md](./platforms/clubhouse.md)), `handleAuthFailure` runs:

1. Marks the active credential `invalid`.
2. Bumps the lifecycle generation.
3. Clears the bot's timers and deletes the runtime.
4. Sets bot status `'error'`.
5. Sets all `active`/`joining` rooms to `error`.

The bot is effectively halted on authentication failure. It can be restarted after a new valid credential is created.

## Boot-time Resume (`startAll`)

On process startup, `botManager.startAll()` runs a **global** `findByStatus('active')` query — an intentional system-level bootstrap: it restarts every bot whose document is `active`, each under its own tenant scope. No request path reaches this query (see [runtime.md](./runtime.md)).

## Restart

There is no separate "restart" endpoint. Restarting is achieved by `POST .../stop` then `POST .../start`, or by starting while `active` (a no-op if the runtime already exists). If a start is requested while the bot is `starting`/`stopping`, it awaits the in-flight transition.

## Room Status During Lifecycle

The bot's configured rooms carry their own status (see [domain-model.md](./domain-model.md)):

- `configured` → created but never joined.
- `joining` → join in progress (set by bot start or manual join).
- `active` → joined, sync + ping timers running.
- `leaving` → leave in progress (manual leave sets `inactive` on success).
- `inactive` → left; skipped by `startAll` and bot start.
- `error` → join failed or auth failure; skipped by bot start.
