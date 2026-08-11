# API

Two HTTP surfaces are served by the same Express app:

- **`/v1`** — the modern, tenant-scoped API (primary).
- **`/api`** — the legacy Clubhouse-specific API, preserved for backward compatibility.

Base server: port `4000` by default (`PORT`).

## Common conventions

- `GET /health` — unauthenticated liveness probe (`{ status: 'ok', uptime }`), used by the container healthcheck.
- `GET /` — `Hello World!`.
- Swagger UI at `/api-docs`; raw OpenAPI JSON at `/swagger.json` (requires `x-api-key`).

## `/v1` (public API)

Every `/v1` route requires a valid API key (`x-api-key` header) that resolves to an **active tenant**. All resource access is scoped to that tenant — a bot, room, or credential owned by another tenant returns `404`. Responses use a `{ "data": ... }` envelope; create endpoints return `201`, deletes return `204`, and errors return `{ "error": { "type", "message" } }`. A global rate limit of **100 requests/minute** applies.

| Resource | Endpoint | Description |
| --- | --- | --- |
| **Bots** | `POST /v1/bots` | Create a bot (`name`, `platform: "clubhouse"`, optional `aiConfig`, `personality`, `welcomeMessage`) |
| | `GET /v1/bots` | List the tenant's bots |
| | `GET /v1/bots/:botId` | Get one bot |
| | `PATCH /v1/bots/:botId` | Update a bot (partial `aiConfig` is merged, not replaced) |
| | `DELETE /v1/bots/:botId` | Stop and delete a bot |
| | `POST /v1/bots/:botId/start` | Start the bot (needs an active credential; otherwise `400`) |
| | `POST /v1/bots/:botId/stop` | Stop the bot |
| **Credentials** | `POST /v1/bots/:botId/credentials` | Add a platform token (encrypted at rest) |
| | `GET /v1/bots/:botId/credentials` | List credentials (ciphertext never returned) |
| | `DELETE /v1/bots/:botId/credentials/:credentialId` | Delete a credential |
| **Rooms** | `POST /v1/bots/:botId/rooms` | Configure a room (`externalRoomId`, optional `settings`) |
| | `GET /v1/bots/:botId/rooms` | List the bot's rooms |
| | `GET /v1/bots/:botId/rooms/:roomId` | Get one room |
| | `POST /v1/bots/:botId/rooms/:roomId/join` | Join the room on the platform |
| | `POST /v1/bots/:botId/rooms/:roomId/leave` | Leave the room |
| **Usage** | `GET /v1/bots/:botId/usage` | Usage summary for a bot |
| | `GET /v1/bots/:botId/events` | Recorded usage events (`?limit=` honored) |

### Example: create a bot

```http
POST /v1/bots
x-api-key: <tenant-api-key>
content-type: application/json

{ "name": "Alpha", "platform": "clubhouse", "welcomeMessage": "Welcome {username}!" }
```

```json
201
{ "data": { "id": "…", "name": "Alpha", "platform": "clubhouse", "status": "created", … } }
```

## `/api` (legacy Clubhouse API)

Clubhouse-specific endpoints, protected by the API key and rate limited. Preserved so existing integrations keep working.

| Area | Endpoints |
| --- | --- |
| Channels | `POST /api/channels/join_room`, `accept_invite`, `get_room_users`, `leave`, `channels`, `current-channel`, `room-msgs`, `send-room-msg`, `me` |
| Channel | `POST /api/channel/start-timer` |
| Chatbot | `POST /api/chatbot/start`, `POST /api/chatbot/stop` |
| Notifications | `POST /api/notifications`, `POST /api/notifications/actionable` |
| Profiles | `POST /api/profiles/add_profile`, `change-profile`, `search_users`, `accept_invite`, `get_user`; `GET /api/profiles/all_users`, `GET /api/profiles/get_token` |
| Users | `POST /api/users/search_users` |

## Error format

Errors are normalized by the global error handler into:

```json
{ "error": { "type": "NOT_FOUND", "message": "…" } }
```

Common types include `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `RATE_LIMITED`, and `INTERNAL_ERROR`.

## See also

- [`docs/architecture.md`](architecture.md) — how the API fits into the system.
- [`docs/bot-lifecycle.md`](bot-lifecycle.md) — what `start`/`stop`/`join` do.
