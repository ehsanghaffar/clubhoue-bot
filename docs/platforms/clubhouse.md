# Clubhouse Integration

The only implemented platform adapter is **Clubhouse**. This document describes the actual integration in [`src/platforms/clubhouse/`](../../src/platforms/clubhouse/).

## Identity model

- The bot is a **normal Clubhouse user account operated programmatically** — there is no Clubhouse-native "bot" concept.
- The Clubhouse credential carries the external user identity: `externalAccountId` (Clubhouse user id) and `externalAccountName` on the `BotCredential` (see [domain-model.md](../domain-model.md)).
- Internally the bot is identified by its `Bot` document (`tenantId` + unique `name`). The external Clubhouse identity is a property of the attached credential.

## Adapter wiring

- [`src/platforms/adapter.ts`](../../src/platforms/adapter.ts) defines the `CommunityPlatformAdapter` contract (`platform`, `getRoom`, `joinRoom`, `leaveRoom`, `getMessages`, `sendMessage`, `getUser`, `searchUsers`, `inviteSpeaker`, `acceptSpeakerInvite`, optional `ping`) and the adapter registry.
- Only `'clubhouse'` is registered (`registerBuiltinAdapters` in startup; a comment notes "Discord will be added later" — Discord is **not** implemented).
- [`src/platforms/clubhouse/adapter.ts`](../../src/platforms/clubhouse/adapter.ts) — `ClubhouseAdapter` builds a `ClubApiService` from the credential (`token`, `deviceId`, `externalAccountId`, `externalAccountName`) and wraps every call in `toAdapterError`, converting `ClubhouseApiError` → `AdapterError`.

## HTTP transport

- [`src/platforms/clubhouse/agent.ts`](../../src/platforms/clubhouse/agent.ts) issues requests to `https://www.clubhouseapi.com/api` (`apiRoot`), with a custom `User-Agent` and `Host: www.clubhouseapi.com` header.
- [`src/platforms/clubhouse/http.ts`](../../src/platforms/clubhouse/http.ts) — `wrapClubhouseCall` runs the request, asserts a 2xx via `assertClubhouseResponse`, parses JSON, and converts non-OK statuses to `ClubhouseApiError` (see error classification below).

## Endpoints (`ClubApiService`, [`api.service.ts`](../../src/platforms/clubhouse/api.service.ts))

The service exposes these operations (all hit the private Clubhouse API):

| Method | Platform endpoint | Purpose |
|---|---|---|
| `getChannels` | `GET /get_feed_v3?get_unconnected_rooms=true` | List channels/rooms |
| `getChannel` | `/get_channel` | Room lookup by channel id |
| `joinChannel` | `/join_channel` | Join a room (room joining) |
| `leaveChannel` | `/leave_channel` | Leave a room (room leaving) |
| `getChannelMessages` | `/get_channel_messages` | Fetch messages (room sync) |
| `sendChannelMessage` | `/send_channel_message` | Send a message |
| `getUser` | `/get_profile` | User lookup |
| `searchUsers` | `/search_users` | User search |
| `getProfile` | *(local)* | Returns the stored `Profile` (no HTTP) |
| `acceptSpeakerInvite` | `/accept_speaker_invite` | Accept a speaker invitation |
| `inviteToSpeakers` | `/invite_speaker` | Invite a user to speakers |
| `activePing` | `/active_ping` | Active ping |
| `emojiReaction` | `/emoji_reaction` | Emoji reaction |
| `getNotifications` | `/get_notifications` | Notifications (paged) |
| `getActionableNotifications` | `/get_actionable_notifications` | Actionable notifications |

Each method documents its input options (from [`types.ts`](../../src/platforms/clubhouse/types.ts)) and returns a parsed JSON response.

## Integration capabilities (adapter-level)

### Room joining
- `joinRoom(roomId)` → `joinChannel({ channel: roomId })`. Failure → `AdapterError`.
- Caller: `RoomService.join` / `BotManager.doStartBot` (joins rooms that are `configured`/`active` but not yet joined at boot).

### Room leaving
- `leaveRoom(roomId)` → `leaveChannel({ channel: roomId })`.
- Caller: `RoomService.leave` (sets status `leaving` → `inactive`).

### Messages
- `getMessages(roomId)` → `getChannelMessages`, mapped by `mapMessages` to core `Message[]` (`id`, `senderId`, `senderName`, `text`, `sentAt`, `roomId`).
- `sendMessage(roomId, message)` → `sendChannelMessage`.
- Callers: `RoomService.syncRoom` (fetch) and the AI/automation rules (send).

### Speaker invitations
- `inviteSpeaker(roomId, userId)` → `inviteToSpeakers`.
- `acceptSpeakerInvite(roomId)` → `acceptSpeakerInvite` (uses the credential token).
- Callers: the `speaker-request` automation rule (auto-invite gated by `INVITE_ALLOW_LIST` and `autoInviteEnabled`) and the `accept-invite` API endpoint.

### Notifications
- `getNotifications` / `getActionableNotifications` are implemented in `ClubApiService` but are **not exposed** through the `CommunityPlatformAdapter` contract — nothing in the runtime calls them today.

## Active ping

- `ping(roomId)` → `activePing({ channel: roomId })` on the adapter.
- Runs only for rooms in `active` status while the bot runtime is alive. Two paths:
  1. **Per-room interval**: `setInterval(pingRoom, DEFAULT_ACTIVE_PING_INTERVAL_MS)` armed for each joined room; default `180000` ms (3 min), clamped to `[120000, 300000]` via `ACTIVE_PING_INTERVAL_MS` (`clampActivePingInterval`).
  2. **Join-time ping** with a bounded retry budget: `JOIN_PING_RETRY_ATTEMPTS` (default 3) attempts with exponential backoff (`JOIN_PING_RETRY_BASE_DELAY_MS`, default 1000 ms). This exists because a bot that just joined may need the server to register membership.
- Error handling: an auth failure (401/403) from the ping is **terminal** — the credential is marked `invalid` and the bot is torn down (`handleAuthFailure`, see [bot-lifecycle.md](../bot-lifecycle.md)). Transient failures (`retryable`) are logged and the runtime is kept alive for the next ping.
- Multi-room behavior: one ping interval per joined room, scoped by `botId:roomId` (see [runtime.md](../runtime.md)).
- Stopping: timers are cleared on stop/teardown and when a bot is not in `active` status.

## Error classification

[`errors.ts`](../../src/platforms/clubhouse/errors.ts):

| HTTP status | Kind | retryable |
|---|---|---|
| 401 / 403 | `authentication` | no |
| 404 | `not_found` | no |
| 409 | `conflict` | no |
| 429 | `rate_limited` | yes |
| 408 | `timeout` | yes |
| 5xx | `transient` | yes |
| other | `request` | no |

Network failures (`AbortError`/`TimeoutError`/connection errors) → `timeout`/`network` (retryable). `ClubhouseApiError` exposes `operation`, `status`, `kind`, `retryable`, `authenticationFailure`, `rateLimited`.

## Limitations

- The endpoint set and message shapes are **reverse-engineered from the private Clubhouse API**; there is no official SDK, and the integration may break if Clubhouse changes its API (see [limitations.md](../limitations.md)).
- `emojiReaction` and the notification endpoints are implemented but not wired into the current adapter contract or runtime flow.
- Credentials are the token/device-id of a real Clubhouse account; auth failures surface as `AdapterError` with `authenticationFailure` and trigger the credential-invalidation path.
