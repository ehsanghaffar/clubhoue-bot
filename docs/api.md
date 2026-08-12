# API

Two HTTP surfaces are served by the same Express app:

- **`/v1`** — the modern, tenant-scoped API (primary).
- **`/api`** — the legacy Clubhouse-specific API, preserved for backward compatibility but **deprecated** (see below).

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
| **Messages** | `POST /v1/bots/:botId/rooms/:roomId/messages` | Send a message (`message`) — migrated from `send-room-msg` |
| | `GET /v1/bots/:botId/rooms/:roomId/messages` | List normalized room messages — migrated from `room-msgs` |
| | `POST /v1/bots/:botId/rooms/:roomId/accept-invite` | Accept a speaker invite — migrated from `accept_invite` |
| **Users** | `POST /v1/bots/:botId/users/search` | Search users (`query`) — migrated from `search_users` |
| | `GET /v1/bots/:botId/users/:userId` | Get a user by id — migrated from `get_user` |
| | `GET /v1/bots/:botId/me` | The bot's own profile — migrated from `channels/me` |
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

### Runtime contract

- Runtime operations that construct or use a platform adapter (for example
	`POST /v1/bots/:botId/start`, `GET /v1/bots/:botId/me`, and background
	worker calls) always resolve credentials in a tenant-aware manner. A bot's
	active credential is looked up using both the tenant and bot id; runtime
	code will not act on a credential belonging to a different tenant.
- If a runtime operation requires an active credential and none exists the
	API returns `400 BAD_REQUEST` (or `404` for cross-tenant access attempts).
- Adapter keep-alive (`ping`) and per-room sync loops are scoped to the
	`botId:roomId` runtime so the platform's per-room presence semantics are
	preserved.

## `/api` (legacy Clubhouse API — deprecated)

Clubhouse-specific endpoints, protected by the API key and rate limited. The surface is **deprecated** (RFC 8594): every `/api` response carries `Deprecation` and `Sunset` headers plus a `Link: </v1>; rel="successor-version"`, and the server logs a deprecation warning at startup. It keeps working until the sunset date so existing integrations can migrate at their own pace.

| Area | Endpoints |
| --- | --- |
| Channels | `POST /api/channels/join_room`, `accept_invite`, `get_room_users`, `leave`, `channels`, `current-channel`, `room-msgs`, `send-room-msg`, `me` |
| Channel | `POST /api/channel/start-timer` |
| Chatbot | `POST /api/chatbot/start`, `POST /api/chatbot/stop` |
| Notifications | `POST /api/notifications`, `POST /api/notifications/actionable` |
| Profiles | `POST /api/profiles/add_profile`, `change-profile`, `search_users`, `accept_invite`, `get_user`; `GET /api/profiles/all_users`, `GET /api/profiles/get_token` |
| Users | `POST /api/users/search_users` |

### Migration map (legacy → `/v1`)

Most legacy capabilities have a tenant-scoped `/v1` equivalent:

| Legacy | `/v1` replacement |
| --- | --- |
| `POST /api/profiles/add_profile` / `GET get_token` | `POST /v1/bots/:botId/credentials` (per-bot, encrypted) |
| `POST /api/channels/join_room` | `POST /v1/bots/:botId/rooms/:roomId/join` |
| `POST /api/channels/leave` | `POST /v1/bots/:botId/rooms/:roomId/leave` |
| `POST /api/channels/send-room-msg` | `POST /v1/bots/:botId/rooms/:roomId/messages` |
| `POST /api/channels/room-msgs` | `GET /v1/bots/:botId/rooms/:roomId/messages` |
| `POST /api/channels/accept_invite`, `POST /api/profiles/accept_invite` | `POST /v1/bots/:botId/rooms/:roomId/accept-invite` |
| `POST /api/channels/current-channel` | `GET /v1/bots/:botId/rooms/:roomId` |
| `POST /api/channels/channels` | `GET /v1/bots/:botId/rooms` |
| `POST /api/channels/me` | `GET /v1/bots/:botId/me` |
| `POST /api/channels/search_users`, `POST /api/profiles/search_users`, `POST /api/users/search_users` | `POST /v1/bots/:botId/users/search` |
| `POST /api/profiles/get_user` | `GET /v1/bots/:botId/users/:userId` |
| `POST /api/chatbot/start` / `stop` | `POST /v1/bots/:botId/start` / `stop` (rooms control AI via `aiEnabled`) |

Capabilities that remain Clubhouse-specific (no platform-agnostic adapter method yet) stay on `/api` for now: `get_room_users`, `start-timer`, `notifications`, `notifications/actionable`, `all_users`, `change-profile`. Migrating them would require extending the platform adapter contract.

## Error format

Errors are normalized by the global error handler into:

```json
{ "error": { "type": "NOT_FOUND", "message": "…" } }
```

Common types include `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `RATE_LIMITED`, and `INTERNAL_ERROR`.

## See also

- [`docs/architecture.md`](architecture.md) — how the API fits into the system.
- [`docs/bot-lifecycle.md`](bot-lifecycle.md) — what `start`/`stop`/`join` do.
