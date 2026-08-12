# Platforms

The platform layer isolates every social/community platform behind a single adapter contract, so the core domain never depends on a platform-specific API.

## Adapter contract

`src/platforms/adapter.ts`:

- **`CommunityPlatformAdapter`** — `getRoom`, `joinRoom`, `leaveRoom`, `getMessages`, `sendMessage`, `getUser`, `searchUsers`, `inviteSpeaker`, `acceptSpeakerInvite`, and an optional `ping`.
- **`AdapterError`** — typed error so worker/automation layers can react (e.g. mark a credential invalid) without knowing platform internals.
- **`AdapterCredentialData`** — decrypted credential material handed to a factory: `token`, `deviceId`, `externalAccountId`, `externalAccountName`.
- **`AdapterFactory`** — `(credential) => CommunityPlatformAdapter`.
- **`registerAdapterFactory(platform, factory)` / `createPlatformAdapter(platform, credential)`** — registry. Tests register a fake `clubhouse` factory to run the whole pipeline offline.

The core domain (bots, rooms, events, automation, AI, usage) depends only on this interface.

## Clubhouse implementation

`src/platforms/clubhouse/`:

| File | Role |
| --- | --- |
| `agent.ts` | Low-level client for Clubhouse's private mobile API. |
| `api.service.ts` | Typed, safe wrappers (join/leave channels, send messages, search users, notifications, etc.). |
| `adapter.ts` | `ClubhouseAdapter` — implements `CommunityPlatformAdapter`; per-credential, no globals. |
| `mappers.ts` | Normalizes Clubhouse response shapes into domain types (`Room`, `User`, `Message`). |
| `types.ts` | Clubhouse-specific types. |
| `index.ts` | Platform wiring. |

## Security boundary

Credentials are decrypted only in `BotService.createAdapter`, right before the adapter is constructed. Plaintext tokens never travel through the API, automation, or logging layers.

Runtime contract notes:

- Credential decryption is strictly local to `BotService.createAdapter` and is always performed with tenant-scoped inputs. Platform adapters must be created per-decrypted-credential instance and must not rely on any global or cross-tenant credential material.
- Keep-alive / active-ping behavior is implemented by the adapter when supported. `BotManager` and background jobs call the adapter's optional `ping(externalRoomId)` method on a per-bot-per-room basis; adapters must implement `ping` without assuming a global bot identity.

## Adding a platform (Discord later)

Add a `src/platforms/discord/` directory implementing `CommunityPlatformAdapter`, normalize into the shared domain types, and register it with `registerAdapterFactory('discord', …)`. No core-domain changes are required.
