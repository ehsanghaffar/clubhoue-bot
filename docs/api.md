# API

This document describes the HTTP API as it exists in the current source. The route inventory was enumerated from [`src/api/routes/v1.routes.ts`](../src/api/routes/v1.routes.ts) and cross-checked against the programmatically generated OpenAPI document ([`src/api/openapi/v1.openapi.ts`](../src/api/openapi/v1.openapi.ts)).

**Authoritative API specification:** the generated OpenAPI document is the authoritative spec. It is served by the running server at `/openapi.json` and browsable via Swagger UI at `/api-docs`. See [Swagger / OpenAPI](#swagger--openapi) below.

## Conventions

- All API routes are under **`/v1`**. There is no `/api` prefix and no legacy `/api` routes.
- Every `/v1` route requires the `x-api-key` header (see [security/authentication.md](./security/authentication.md)).
- All request bodies are JSON.
- Successful responses are wrapped as `{ "data": ... }`.
- Errors are returned as `{ "error": { "type": "...", "message": "..." } }` (see [error-handling.md](./error-handling.md)).
- Rate limiting is applied at `/v1` in `src/app.ts`: 100 requests per 60s window per IP. Exceeding it returns HTTP 429 with `{ "error": { "type": "RATE_LIMITED", "message": "Too many requests, please try again later." } }`.

## Authentication

Every request must include:

```
x-api-key: <tenant api key>
```

Missing or invalid keys return `401`. A `botId`/`credentialId`/`externalRoomId` that does not belong to the authenticated tenant resolves to `404` (see [security/authentication.md](./security/authentication.md)).

## Route Inventory

### Bots

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/v1/bots` | Create a bot (201) |
| `GET` | `/v1/bots` | List bots for the tenant |
| `GET` | `/v1/bots/:botId` | Get a bot |
| `PATCH` | `/v1/bots/:botId` | Update a bot (merges `aiConfig`) |
| `DELETE` | `/v1/bots/:botId` | Delete a bot (204) |
| `POST` | `/v1/bots/:botId/start` | Start the bot runtime |
| `POST` | `/v1/bots/:botId/stop` | Stop the bot runtime |

### Credentials

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/v1/bots/:botId/credentials` | Create a credential (201) |
| `GET` | `/v1/bots/:botId/credentials` | List credentials |
| `DELETE` | `/v1/bots/:botId/credentials/:credentialId` | Delete a credential (204) |

### Rooms

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/v1/bots/:botId/rooms` | Configure a room (201) |
| `GET` | `/v1/bots/:botId/rooms` | List rooms for a bot |
| `GET` | `/v1/bots/:botId/rooms/:externalRoomId` | Get a room by external room id |
| `POST` | `/v1/bots/:botId/rooms/:externalRoomId/join` | Join a room |
| `POST` | `/v1/bots/:botId/rooms/:externalRoomId/leave` | Leave a room |
| `POST` | `/v1/bots/:botId/rooms/:externalRoomId/messages` | Send a message |
| `GET` | `/v1/bots/:botId/rooms/:externalRoomId/messages` | Get recent messages |
| `POST` | `/v1/bots/:botId/rooms/:externalRoomId/accept-invite` | Accept a speaker invite |

### Users

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/v1/bots/:botId/users/search` | Search Clubhouse users |
| `GET` | `/v1/bots/:botId/users/:userId` | Get a user profile |
| `GET` | `/v1/bots/:botId/me` | Get the bot's own external profile |

### Usage & Events

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/v1/bots/:botId/usage` | Usage summary / event list |
| `GET` | `/v1/bots/:botId/events` | List recent events (`?limit=N`, default 50, max 200) |

## Endpoint Details

### POST /v1/bots

Create a bot.

Body:

```json
{
  "name": "My Bot",
  "platform": "clubhouse",
  "personality": "Be concise (optional)",
  "welcomeMessage": "Welcome! (optional)",
  "aiConfig": {
    "enabled": true,
    "model": "gpt-4o-mini",
    "temperature": 0.4,
    "maxOutputTokens": 150,
    "maxResponseLength": 280,
    "triggerMode": "mention",
    "triggerPrefix": "#",
    "cooldownSeconds": 30
  }
}
```

- `name` — required, 1–100 chars.
- `platform` — required, must be `'clubhouse'`.
- `personality` — optional, max 2000 chars (empty/null allowed).
- `welcomeMessage` — optional, max 500 chars (empty/null allowed).
- `aiConfig` — optional; all fields optional, defaults applied from `DEFAULT_AI_CONFIG`.

Response: `201` with `{ "data": { ...bot } }`.

### GET /v1/bots

List bots for the authenticated tenant. Response: `{ "data": [ ... ] }`.

### GET /v1/bots/:botId

Get a single bot. `404` if it does not belong to the tenant.

### PATCH /v1/bots/:botId

Update a bot. Body fields are the same as create minus `platform`. `aiConfig` is merged (partial) into the existing config. At least one field required. Response: `{ "data": { ...updatedBot } }`.

### DELETE /v1/bots/:botId

Deletes the bot (and stops its runtime first). Response: `204` no content.

### POST /v1/bots/:botId/start

Starts the bot runtime: loads the active credential, creates the platform adapter, joins configured rooms, starts room timers. `400` with message `"Bot has no active credential"` if no active credential exists. Response: `{ "data": { "status": "active", ... } }`.

### POST /v1/bots/:botId/stop

Stops the bot runtime (clears timers, deletes runtime). Response: `{ "data": { "status": "stopped", ... } }`.

### POST /v1/bots/:botId/credentials

Create a credential for a bot.

Body:

```json
{
  "token": "clubhouse-auth-token",
  "deviceId": "optional-device-id",
  "externalAccountId": "optional-external-account-id",
  "externalAccountName": "optional-username"
}
```

- `token` — required (the Clubhouse auth token; encrypted at rest).
- `deviceId`, `externalAccountId`, `externalAccountName` — optional (empty string allowed).

Response: `201` with `{ "data": { ...publicCredential } }`. **The encrypted token is never returned.** The public credential shape is: `id`, `tenantId`, `botId`, `platform`, `status`, `externalAccountId`, `externalAccountName`, `createdAt`, `updatedAt`.

### GET /v1/bots/:botId/credentials

List credentials (public shape, no token). Response: `{ "data": [ ... ] }`.

### DELETE /v1/bots/:botId/credentials/:credentialId

Delete a credential. Response: `204` no content. Deleting a missing or cross-tenant credential is a silent no-op (returns 204).

### POST /v1/bots/:botId/rooms

Configure a room for a bot.

Body:

```json
{
  "externalRoomId": "room-123",
  "settings": {
    "welcomeEnabled": true,
    "aiEnabled": true,
    "autoInviteEnabled": false,
    "moderationEnabled": false,
    "blockedUsers": [],
    "blockedKeywords": [],
    "messageRateLimit": { "max": 10, "windowSeconds": 60 }
  }
}
```

- `externalRoomId` — required, 1–200 chars. This is the canonical Clubhouse room id.
- `settings` — optional. `blockedUsers`/`blockedKeywords` each max 1000 items (each item 1–200 chars). `messageRateLimit.max` 1–1000, `windowSeconds` 1–86400.

Response: `201` with `{ "data": { ...room } }`. Status starts as `'configured'`.

### GET /v1/bots/:botId/rooms

List configured rooms for a bot. Response: `{ "data": [ ... ] }`.

### GET /v1/bots/:botId/rooms/:externalRoomId

Get a room by its external room id. `404` if not found for this bot/tenant.

### POST /v1/bots/:botId/rooms/:externalRoomId/join

Join the Clubhouse room: `adapter.joinRoom` → status `'active'` → emits `room.joined` event. `400` `"Bot has no active credential"` if the bot has no active credential. Response: `{ "data": { "status": "active", ... } }`.

### POST /v1/bots/:botId/rooms/:externalRoomId/leave

Leave the Clubhouse room: `adapter.leaveRoom` (in a `finally`) → status `'inactive'` → emits `room.left` event → notifies `BotManager.onRoomInactive`. Response: `{ "data": { "status": "inactive", ... } }`.

### POST /v1/bots/:botId/rooms/:externalRoomId/messages

Send a message to the room.

Body:

```json
{ "message": "Hello!" }
```

`message` — required, 1–2000 chars. Response: `200` with `{ "data": { "ok": true } }`.

### GET /v1/bots/:botId/rooms/:externalRoomId/messages

Get recent messages for the room (fetched from Clubhouse and deduplicated). Response: `{ "data": { "messages": [...] } }`.

### POST /v1/bots/:botId/rooms/:externalRoomId/accept-invite

Accept a speaker invite to the room (uses the bot's credential `externalAccountId`). `400` `"Bot has no active credential"` if no active credential. Response: `{ "data": { "ok": true } }`.

### POST /v1/bots/:botId/users/search

Search Clubhouse users.

Body:

```json
{ "query": "username" }
```

`query` — required, 1–200 chars. Response: `{ "data": { "users": [...] } }`.

### GET /v1/bots/:botId/users/:userId

Get a Clubhouse user profile by external user id. Response: `{ "data": { "user": {...} } }`.

### GET /v1/bots/:botId/me

Get the bot's own external profile (via credential `externalAccountId`). `400` `"Bot has no active credential"` if none. Response: `{ "data": { "user": {...} } }`.

### GET /v1/bots/:botId/usage

Analytics summary for the bot (composed from usage counters plus live room/member counts by `AnalyticsService`). Response: `{ "data": { ...UsageSummary } }` where `UsageSummary` has fields `messages`, `aiResponses`, `aiRequests`, `users`, `rooms`, `speakerInvites`, `automationActions`, `errors`. See [usage.md](./usage.md).

### GET /v1/bots/:botId/events?limit=N

List recent usage events for the bot, newest first (each event has `type`, `timestamp`, `roomId?`, `meta?`). `limit` clamped to 1–200, default 50. Response: `{ "data": [ ...usageEvents ] }`.

## Swagger / OpenAPI

- **Swagger UI URL:** `GET /api-docs` (served by `swagger-ui-express`).
- **OpenAPI JSON URL:** `GET /openapi.json`.
- The spec is built programmatically in [`src/api/openapi/v1.openapi.ts`](../src/api/openapi/v1.openapi.ts) (OpenAPI 3.0.0, title *"Clubhouse Bot API"*, version 1.0.0).
- **Authentication scheme:** `ApiKeyAuth` — API key in the `x-api-key` header.
- **Servers:** `http://localhost:{PORT}/v1` where `PORT` is read at app creation time.
- **Schemas defined:** `Tenant`, `Bot`, `BotCredential`, `BotRoom`, `RoomSettings`, `Message`, `User`, `CommunityEvent`, and the error envelope `{ error: { type, message } }`.
- **Paths:** 17 paths / 23 operations, matching the router exactly.

The generated OpenAPI document remains the authoritative API specification; this Markdown file is a human-readable summary and may not be exhaustive for every schema field. When in doubt, consult `/openapi.json`.
