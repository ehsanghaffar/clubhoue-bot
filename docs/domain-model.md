# Domain Model

This document describes the entities that exist in the current source code. Every field listed below is defined in the corresponding type/schema files; nothing is inferred from historical plans.

The domain types live under [`src/core/**/types.ts`](../src/core/), and the persisted representations are the Mongoose models under [`src/models/`](../src/models/). Mongo collections are created from the Mongoose models; see [database.md](./database.md) for collection names and indexes.

## Entity Overview

| Entity | Type | Persisted | Notes |
| --- | --- | --- | --- |
| `Tenant` | [`tenant.types.ts`](../src/core/tenants/tenant.types.ts) | `tenant` | Top-level auth boundary, owns API keys |
| `Bot` | [`bot.types.ts`](../src/core/bots/bot.types.ts) | `bot` | A programmatically-operated Clubhouse user account |
| `BotCredential` | [`credential.types.ts`](../src/core/credentials/credential.types.ts) | `botCredential` | Encrypted Clubhouse auth token + device id |
| `BotRoom` | [`room.types.ts`](../src/core/rooms/room.types.ts) | `botRoom` | A Clubhouse room the bot can join |
| `RoomMember` | [`room.types.ts`](../src/core/rooms/room.types.ts) | `roomMember` | A user seen in a room |
| `CommunityEvent` | [`event.types.ts`](../src/core/events/event.types.ts) | `communityEvent` | An event emitted by the runtime |
| `ActionRecord` | [`action-idempotency.ts`](../src/core/events/action-idempotency.ts) | `actionRecord` | Idempotency record for automation actions |
| `ProcessedMessage` | [`message-dedup.ts`](../src/infrastructure/deduplication/message-dedup.ts) | `processedMessage` | Message deduplication key |
| `UsageEvent` | [`usage.types.ts`](../src/core/usage/usage.types.ts) | `usageEvent` | Append-only usage telemetry |

There is also an internal normalized message/user shape used by the platform adapter contract (`Message`, `User`, `Room` in [`types.ts`](../src/core/types.ts)) that is **not** persisted as a document.

---

## Tenant

Purpose: top-level multi-tenant boundary. Authenticates via `x-api-key`; owns bots, credentials, rooms, events and usage.

Fields (from `tenant.types.ts` / `Tenant` Mongoose model):

- `id` — internal string id (nanoid(12)).
- `name` — tenant name.
- `status` — `'active' | 'suspended'`. A suspended tenant fails authentication with 401 (see [security/authentication.md](./security/authentication.md)).
- `apiKeys` — array of API key strings. Indexed.
- `createdAt` / `updatedAt` — timestamps.

Lifecycle / bootstrap: `TenantService.ensureDefaultTenant()` creates a single default tenant if none exists, using the configured `API_KEY` value as its API key. This is a bootstrap path run at startup (see [configuration.md](./configuration.md)).

---

## Bot

Purpose: a bot is a **normal Clubhouse user account operated programmatically**. The bot does not have its own native identity on the Clubhouse side; the external identity lives on the credential (`externalAccountId` / `externalAccountName`), not on the `Bot` document (see [platforms/clubhouse.md](./platforms/clubhouse.md) for the identity model).

Fields (from `bot.types.ts` / `Bot` model):

- `id` — internal string id (nanoid(12)).
- `tenantId` — owning tenant.
- `name` — display name.
- `platform` — `'clubhouse'` (enum; only Clubhouse is registered).
- `status` — `'created' | 'starting' | 'active' | 'stopping' | 'stopped' | 'error'` (see [bot-lifecycle.md](./bot-lifecycle.md)).
- `aiConfig` — AI behavior configuration (subdocument):
  - `enabled` — bool.
  - `model` — model name (default `process.env.OPENAI_MODEL ?? 'gpt-4o-mini'`).
  - `temperature` — float (default `OPENAI_TEMPERATURE ?? 0.4`).
  - `maxOutputTokens` — int (default `OPENAI_MAX_TOKENS ?? 150`).
  - `maxResponseLength` — int (default `280`).
  - `triggerMode` — `'mention' | 'prefix' | 'keyword' | 'question' | 'manual'` (default `'mention'`).
  - `triggerPrefix` — string (default `'#'`).
  - `cooldownSeconds` — int (default `30`).
- `personality` — optional string.
- `welcomeMessage` — optional string.
- `createdAt` / `updatedAt`.

Relationships: `Bot` 1→N `BotCredential` (active credential used at runtime); `Bot` 1→N `BotRoom`.

Unique index: `{ tenantId: 1, name: 1 }`.

---

## BotCredential

Purpose: stores the Clubhouse authentication token (encrypted) plus optional external account metadata. **The token is encrypted at rest and is never returned by the API.**

Fields (from `credential.types.ts` / `BotCredential` model):

- `id` — internal string id (nanoid(12)).
- `tenantId`, `botId` — ownership.
- `platform` — `'clubhouse'`.
- `encryptedToken` — the encrypted envelope (base64) of the JSON `{ token, deviceId }` payload. Required.
- `externalAccountId` — optional Clubhouse external user id (this is the external identity for the bot).
- `externalAccountName` — optional Clubhouse external username.
- `status` — `'active' | 'invalid' | 'revoked'`.
- `createdAt` / `updatedAt`.

Security: see [security/credentials.md](./security/credentials.md). Decryption to plaintext happens only in `credentialService.decryptForRuntime`, called when building a platform adapter at bot start.

---

## BotRoom

Purpose: a Clubhouse room that the bot can join.

Fields (from `room.types.ts` / `BotRoom` model):

- `id` — internal string id (nanoid(12)).
- `tenantId`, `botId` — ownership.
- `platform` — `'clubhouse'`.
- `externalRoomId` — the **canonical Clubhouse room identifier** (see below).
- `status` — `'configured' | 'joining' | 'active' | 'leaving' | 'inactive' | 'error'`.
- `settings` — subdocument:
  - `welcomeEnabled` (default `true`)
  - `aiEnabled` (default `true`)
  - `autoInviteEnabled` (default `false`)
  - `moderationEnabled` (default `false`)
  - `blockedUsers` (default `[]`)
  - `blockedKeywords` (default `[]`)
  - `messageRateLimit` — `{ max: 10, windowSeconds: 60 }`
- `joinedAt` — optional, set when the room is joined.
- `lastSeenAt` — optional.
- `createdAt` / `updatedAt`.

### Room identity — internal vs external

- **Internal database id** (`room.id`, nanoid) — used by nothing in the public API path for room lookup; it is the Mongo `_id`. Public API routes address rooms by `externalRoomId`.
- **`externalRoomId`** — the canonical Clubhouse room identifier, supplied by the client when creating a room and used everywhere the platform is contacted (join, leave, get messages, ping). The OpenAPI spec (`v1.openapi.ts`) describes `externalRoomId` as *"Canonical Clubhouse room identity"*.

Unique index: `{ tenantId: 1, botId: 1, externalRoomId: 1 }` — a bot cannot have two configured rooms for the same Clubhouse room id.

Repository semantics: room lookup by external room id is tenant- and bot-scoped (`findByExternalRoomId(tenantId, botId, externalRoomId)`).

---

## RoomMember

Purpose: tracks a Clubhouse user seen in a room (used to emit `user.joined` events on first sight).

Fields (from `room.types.ts` / `RoomMember` model):

- `id` — nanoid(12).
- `roomId` — the internal `BotRoom.id`.
- `userId` — Clubhouse external user id.
- `displayName` — optional.
- `firstSeenAt` — default `Date.now`.

Unique index: `{ roomId: 1, userId: 1 }`.

---

## CommunityEvent

Purpose: the persisted event record processed by the event pipeline.

Fields (from `event.types.ts` / `CommunityEvent` model):

- `id` — deterministic string id derived from event fields (see [events.md](./events.md)).
- `tenantId`, `botId`, `roomId` — ownership/context.
- `type` — one of 8 event types (see [events.md](./events.md)).
- `status` — `'pending' | 'processing' | 'processed' | 'failed'`.
- `attempts` — int (default 0).
- `claimId` — ownership token while processing.
- `error` — optional error message.
- `processedAt` — optional.
- `expiresAt` — optional TTL expiry (set only for `processed` events).
- `payload` — type-specific payload.
- `createdAt` / `updatedAt`.

---

## ActionRecord

Purpose: idempotency record for automation actions (see [idempotency.md](./idempotency.md)).

Fields (from the `ActionRecord` model):

- `_id` — string (the idempotency key `{actionType}:{tenantId}:{eventId}:{ruleId}`).
- `tenantId` — indexed.
- `actionType` — `'ai_response' | 'welcome' | 'speaker_invite'`.
- `ruleId`, `eventId` — provenance.
- `botId`, `roomId` — context.
- `status` — `'pending' | 'processing' | 'executed' | 'failed'`.
- `attempts` — int (default 0).
- `claimedAt`, `leaseUntil`, `claimId` — claim/lease fields.
- `executedAt` — optional.
- `error` — optional.
- timestamps.

---

## ProcessedMessage

Purpose: message deduplication (see [events.md](./events.md) / [database.md](./database.md)).

Fields:

- `_id` — nanoid(12).
- `key` — required, unique (the dedup key `processed:{botId}:{roomId}:{messageId}`).
- `expiresAt` — required TTL (`expires: 0`), default 24h.

---

## UsageEvent

Purpose: append-only usage telemetry (see [usage.md](./usage.md)).

Fields:

- `id` — nanoid(12).
- `tenantId`, `botId` — required.
- `roomId` — optional.
- `type` — one of 8 `UsageType` values.
- `timestamp` — default `Date.now`.
- `meta` — free-form mixed.

Index: `{ tenantId: 1, botId: 1, timestamp: -1 }`.

---

## Ownership & Tenant Isolation

Ownership flows through `tenantId`:

```text
Tenant
 ↓
Bot (tenantId)
 ↓
Credential (tenantId, botId)
 ↓
Room (tenantId, botId)
 ↓
Event / Usage / ActionRecord (tenantId, botId)
```

All API read paths are tenant-scoped through the authenticated tenant context. A resource that does not belong to the current tenant is treated as **not found (404)** to avoid leaking existence across tenants (see [security/authentication.md](./security/authentication.md) and [error-handling.md](./error-handling.md)).

## Platform-Normalized Types (not persisted)

[`src/core/types.ts`](../src/core/types.ts) defines normalized `Room`, `User`, and `Message` shapes used by the platform adapter contract and mappers. These are the internal representation of Clubhouse data; they are not stored as documents.
