# Bot Lifecycle

How a bot is created, started, and run.

## Domain model

- **Bot** (`src/core/bots`) — `id`, `tenantId`, `name`, `platform`, `status`, `aiConfig` (per-bot AI settings), `personality`, `welcomeMessage`.
- **BotCredential** (`src/core/credentials`) — encrypted platform token, `externalAccountId`, `externalAccountName`, `status` (`active` / `revoked` / `invalid`). The plaintext token is **never** returned by the API.
- **BotRoom** (`src/core/rooms`) — `externalRoomId`, `status` (`configured` / `joining` / `active` / `inactive` / `error`), `settings` (`welcomeEnabled`, `aiEnabled`, `autoInviteEnabled`, `moderationEnabled`).

## Lifecycle

```text
Create Bot → Attach Credential → Configure Room → Start Bot
                                               ↓
                                     join room (adapter)
                                               ↓
                                      per-room sync loops
                                               ↓
                                user joins / messages → events
                                               ↓
                                    Stop Bot (loops cleared)
```

### 1. Create

`POST /v1/bots` stores the bot with status `created`.

### 2. Attach a credential

`POST /v1/bots/:botId/credentials` encrypts the platform token (AES-256-GCM) before persistence. `BotService.createAdapter` is the **only** place that decrypts a token, immediately before building a platform adapter.

### 3. Configure a room

`POST /v1/bots/:botId/rooms` stores the external room id and settings.

### 4. Start

`POST /v1/bots/:botId/start` → `BotManager.startBot`:

1. Loads the bot; throws if it has no active credential.
2. Builds an adapter via `BotService.createAdapter` → `createPlatformAdapter(platform, decryptedCredential)`.
3. Resolves the bot's external user id (for self-message suppression in automation).
     - Note: the runtime resolution is tenant-aware — the external user id is
         always looked up from the active credential scoped to the bot's
         tenant. Runtime paths (BotManager, adapters, and background jobs) must
         never resolve credentials without tenant context.
4. Stores a per-bot runtime (bot + adapter) in the manager's `runtimes` map — **no global mutable state**; the manager is a per-process instance.
5. For each configured room: joins it (`adapter.joinRoom`, status → `active`, publishes `room.joined`), then starts a sync loop keyed `botId:roomId`.
     - Active ping / keep-alive: when a platform supports it the adapter
         exposes an optional `ping(externalRoomId)` method. `BotManager` starts a
         room-scoped keep-alive loop that calls the adapter's `ping` for that
         specific `botId:roomId` runtime. Keep-alives are intentionally scoped to
         the bot+room to model the platform's requirement that a bot maintain an
         active presence per-room.
6. Marks the bot `active`.

### 5. Run

Each room's sync loop (default every `ROOM_SYNC_INTERVAL_MS`, 15s) calls `RoomService.syncRoom`:

- `adapter.getMessages(externalRoomId)`
- deduplicate via the `MessageDeduplicator` (Mongo or in-memory)
- track newly-seen members → publish `user.joined`
- publish `message.created` for each new message

These normalized events feed the event/automation pipeline (see [`docs/automation.md`](automation.md)). On boot, `BotManager.startAll` restarts every bot that was previously `active`.

### 6. Stop

`POST /v1/bots/:botId/stop` → `BotManager.stopBot`: clears the bot's room loops and marks it `stopped`. `BotManager.stopAll` clears everything on shutdown.

## Background jobs

`BotManager` also exposes `syncRoomByBot`, `pingRoom` (keep-alive), and `inviteSpeaker` for the worker/job layer (see [`docs/deployment.md`](deployment.md) for the worker process).
