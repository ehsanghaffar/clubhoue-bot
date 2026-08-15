# Database

This document describes the MongoDB persistence layer: connection, Mongoose models/collections, indexes, and ownership semantics. Models live in [`src/models/`](../src/models/); repositories live under `src/core/**/` per domain.

## Connection

- `src/config/db/db.ts` — `connectDatabase()` uses Mongoose with `MONGODB_URL`; `serverSelectionTimeoutMS: 5000` and `family: 4` (IPv4).
- Connect happens in `src/server.ts` **after** environment validation and **before** services/HTTP start.
- `MONGODB_URL` is a required environment variable (see [configuration.md](./configuration.md)).

## Collections and Models

Nine Mongoose models:

| Model | Collection | Purpose |
|---|---|---|
| `Tenant` | `tenants` | Tenant account; `apiKeys` array; status `active`/`suspended` |
| `Bot` | `bots` | Bot config; platform `clubhouse`; status enum; `aiConfig` |
| `BotCredential` | `botcredentials` | Encrypted platform credentials; status `active`/`invalid`/`revoked` |
| `BotRoom` | `botrooms` | Room config + lifecycle state; keyed by `externalRoomId` |
| `CommunityEvent` | `communityevents` | Durable normalized events (see [events.md](./events.md)) |
| `ActionRecord` | `actionrecords` | Idempotent action claims (see [idempotency.md](./idempotency.md)) |
| `ProcessedMessage` | `processedmessages` | Message dedup keys with TTL |
| `RoomMember` | `roommembers` | Distinct users seen in rooms |
| `UsageEvent` | `usageevents` | Append-only usage telemetry (see [usage.md](./usage.md)) |

## Indexes

### `Bot`

- `{ tenantId: 1, name: 1 }` — **unique**. Bot names are unique per tenant.
- `tenantId` indexed.

### `BotCredential`

- `tenantId`, `botId` indexed. Lookups are `tenantId + botId` (active credential).

### `BotRoom`

- `{ tenantId: 1, botId: 1, externalRoomId: 1 }` — **unique**. The canonical Clubhouse room id is unique per tenant+bot (see [domain-model.md](./domain-model.md)).
- `tenantId`, `botId` indexed.

### `CommunityEvent`

- `_id` is the deterministic event id (unique by construction).
- `tenantId`, `botId`, `roomId`, `status` indexed.
- `{ tenantId: 1, status: 1, createdAt: 1 }` — supports the recovery query (oldest pending/stale first).
- `expiresAt` — **TTL index** (`expireAfterSeconds: 0`); only `processed` events carry `expiresAt` (30-day retention), so pending/processing/failed events are never TTL-deleted.

### `ActionRecord`

- `_id` is the deterministic action key (unique).
- `tenantId` indexed — all claims are tenant-scoped.

### `ProcessedMessage`

- `key` — **unique**. Dedup key is `processed:{botId}:{roomId}:{messageId}` (see [message-dedup.ts](../src/infrastructure/deduplication/message-dedup.ts)).
- `expiresAt` — **TTL index** (`expires: 0`) so dedup keys expire automatically; `MongoMessageDeduplicator.markProcessed` sets the TTL to `DEFAULT_TTL_SECONDS = 24h` (overridable per call).

### `RoomMember`

- `{ roomId: 1, userId: 1 }` — **unique** — one member record per room+user.

### `UsageEvent`

- `tenantId`, `botId` indexed.
- `{ tenantId: 1, botId: 1, timestamp: -1 }` — supports listing a bot's events newest-first.

### `Tenant`

- `apiKeys` indexed (array). Status enum `active`/`suspended`.

## Repository Layer

Repositories wrap each model and enforce **tenant scoping** at the query level (e.g. `BotRepository.findByIdAndTenant`, `BotRoomRepository.findByExternalRoomIdAndTenantAndBot`). Each domain exposes a `Mongo…Repository` implementation plus a singleton:

- `src/core/bots/` → `BotRepository`
- `src/core/credentials/` → `CredentialRepository`
- `src/core/rooms/` → `RoomRepository`, `RoomMemberRepository`
- `src/core/events/` → `MongoEventStore`, `MongoActionIdempotencyStore`
- `src/core/usage/` → `MongoUsageRepository`

### Intentional system-level queries

There are **deliberate global queries** that bypass tenant scope:

- `BotManager.startAll()` runs `Bot.findByStatus('active')` **without** a tenant filter at boot — the bootstrap restart query. It is intentional (restart every `active` bot across all tenants on process start) and is documented in [runtime.md](./runtime.md).
- `TenantService.ensureDefaultTenant()` bootstraps the default tenant from `API_KEY` at boot.

These are the exceptions; all request-time repository access is tenant-scoped. See [security.md](./security.md) for the isolation model.

## Ownership and Isolation

- Every model carries `tenantId` (and bot-scoped models carry `botId`).
- All HTTP paths resolve the tenant from the `x-api-key` before any query (see [security/authentication.md](./security/authentication.md)).
- Cross-tenant lookups return 404 rather than leaking existence (see [security.md](./security.md)).
- Credential **plaintext tokens are never stored** — only the encrypted envelope is persisted (see [security/credentials.md](./security/credentials.md)).
