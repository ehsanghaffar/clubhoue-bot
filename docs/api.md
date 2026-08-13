# API

The product exposes a single tenant-scoped HTTP API at **`/v1`**.

Base server: port `4000` by default (`PORT`).

## Common conventions

- `GET /health` — unauthenticated liveness probe (`{ status: 'ok', uptime }`).
- `GET /` — `Hello World!`.
- OpenAPI JSON at `/openapi.json` (public).
- Swagger UI at `/api-docs`.

## Authentication

Every `/v1` route requires a valid tenant API key via the `x-api-key` header. All resource access is scoped to that tenant — cross-tenant IDs return `404`. Responses use a `{ "data": ... }` envelope; create endpoints return `201`, deletes return `204`, and errors return `{ "error": { "type", "message" } }`. A global rate limit of **100 requests/minute** applies.

## Endpoints

| Resource | Endpoint | Description |
| --- | --- | --- |
| **Bots** | `POST /v1/bots` | Create a bot |
| | `GET /v1/bots` | List bots |
| | `GET /v1/bots/:botId` | Get one bot |
| | `PATCH /v1/bots/:botId` | Update a bot |
| | `DELETE /v1/bots/:botId` | Stop and delete a bot |
| | `POST /v1/bots/:botId/start` | Start runtime (requires active credential) |
| | `POST /v1/bots/:botId/stop` | Stop runtime |
| **Credentials** | `POST /v1/bots/:botId/credentials` | Add encrypted platform token |
| | `GET /v1/bots/:botId/credentials` | List credentials (no ciphertext) |
| | `DELETE /v1/bots/:botId/credentials/:credentialId` | Delete credential |
| **Rooms** | `POST /v1/bots/:botId/rooms` | Configure room (`externalRoomId`) |
| | `GET /v1/bots/:botId/rooms` | List rooms |
| | `GET /v1/bots/:botId/rooms/:externalRoomId` | Get room by Clubhouse id |
| | `POST /v1/bots/:botId/rooms/:externalRoomId/join` | Join on platform |
| | `POST /v1/bots/:botId/rooms/:externalRoomId/leave` | Leave on platform |
| **Messages** | `POST /v1/bots/:botId/rooms/:externalRoomId/messages` | Send message |
| | `GET /v1/bots/:botId/rooms/:externalRoomId/messages` | List messages |
| | `POST /v1/bots/:botId/rooms/:externalRoomId/accept-invite` | Accept speaker invite |
| **Users** | `POST /v1/bots/:botId/users/search` | Search users |
| | `GET /v1/bots/:botId/users/:userId` | Get user |
| | `GET /v1/bots/:botId/me` | Bot's Clubhouse profile |
| **Usage** | `GET /v1/bots/:botId/usage` | Usage summary |
| | `GET /v1/bots/:botId/events` | Recorded events |

## Room identity

Public room routes use the canonical Clubhouse **`externalRoomId`** (e.g. `M84V9RyJ`), not the internal Mongo `_id`. Rooms are always resolved with `tenantId + botId + externalRoomId`.

## Runtime contract

- Bots are normal Clubhouse user accounts operated programmatically via encrypted credentials.
- `externalAccountId` on the credential is the bot's Clubhouse identity for self-message detection and mention matching.
- Active ping runs immediately after join, then every 2–5 minutes (`ACTIVE_PING_INTERVAL_MS`, default 180s).
- All platform room operations use `externalRoomId`.

## Error format

```json
{ "error": { "type": "NOT_FOUND", "message": "…" } }
```

Common types: `UNAUTHORIZED`, `NOT_FOUND`, `VALIDATION_ERROR`, `RATE_LIMITED`, `INTERNAL_ERROR`.

## See also

- [`docs/architecture.md`](architecture.md)
- [`docs/bot-lifecycle.md`](bot-lifecycle.md)
