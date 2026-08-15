# Credential Security

This document describes the full lifecycle of platform credentials (currently Clubhouse tokens) — where they enter the system, how they are encrypted, where they are stored, when they are decrypted, and what is exposed.

## Where credentials enter the system

- `POST /v1/bots/:botId/credentials` accepts the plaintext Clubhouse credential (`token` required; `deviceId`, `externalAccountId`, `externalAccountName` optional) — see [api.md](../api.md).
- The request body is validated by the Joi `createCredential` schema before the handler runs.

## How they are encrypted

[`src/core/credentials/credential-encryption.ts`](../../src/core/credentials/credential-encryption.ts):

- Encryption is **AES-256-GCM** (`aes-256-gcm`), 32-byte key, 12-byte random IV.
- The credential `{ token, deviceId }` is JSON-serialized and encrypted as a single blob.
- The ciphertext is stored as a versioned envelope:

```text
{ "v": 1, "iv": "<base64>", "tag": "<base64 auth tag>", "data": "<base64 ciphertext>" }
```

### Encryption key resolution

- If `CREDENTIAL_ENCRYPTION_KEY` is a 64-char hex string, it is used directly (as the 32-byte AES key).
- Otherwise the raw value is stretched with `scryptSync(raw, 'clubhouse-credential-salt', 32)`.
- If unset:
  - **Production** → throws; startup also fails earlier via `getMissingEnvVars` (`CREDENTIAL_ENCRYPTION_KEY` is in `PROD_REQUIRED`). No silent fallback.
  - **Non-production** → falls back to a hardcoded **development-only key** (`DEV_ONLY_KEY`), with a warning log. Credentials encrypted with it are **not** protected.
- The derived key is cached in memory (`cachedKey`) for the process lifetime; `resetEncryptionKeyCache()` exists for tests.

## Where encrypted values are stored

- Only the `encryptedToken` field on the `BotCredential` document (`botcredentials` collection) is persisted. The plaintext token and device id are **never stored**.
- `BotCredential` fields: `tenantId`, `botId`, `platform`, `encryptedToken`, `externalAccountId`, `externalAccountName`, `status` (`active`/`invalid`/`revoked`), timestamps.

## When decryption happens

- `CredentialService.decryptForRuntime(credential)` is the **only** place plaintext leaves the encryption layer ([`src/core/credentials/credential.service.ts`](../../src/core/credentials/credential.service.ts)).
- Callers: `BotService` (`src/core/bots/bot.service.ts`) when resolving an active credential to build a platform adapter (e.g. when starting a bot, joining/leaving a room, or handling messages). The decrypted token/device id are used to construct the Clubhouse `Profile` for the adapter.
- Decrypted results are held in memory for the adapter and are never serialized into API responses or logs.

## Where plaintext exists

- In the API request body at `POST .../credentials` (in transit, then discarded).
- In memory: in `CredentialService.createCredential` (just before encryption) and in the decrypted credential used to build a platform adapter at runtime.

## What API responses expose

- `toPublicCredential` ([`src/api/controllers/credentials.controller.ts`](../../src/api/controllers/credentials.controller.ts)) **strips `encryptedToken`** before returning credentials in `POST` (201) and `GET /v1/bots/:botId/credentials` responses. The encrypted envelope is never sent to clients.
- `DELETE /v1/bots/:botId/credentials/:credentialId` returns `204` and is a no-op for missing/cross-tenant credentials (non-disclosure; see below).

## Required encryption configuration

- `CREDENTIAL_ENCRYPTION_KEY` — **required in production** (startup fails without it). See [configuration.md](../configuration.md).
- Security caveat: losing the key makes encrypted credentials unrecoverable (noted in the encryption code).

## Additional notes

- Credential revocation: `CredentialService.revoke` sets status `revoked`; `markInvalid` sets `invalid` (used by the auth-failure path, see [bot-lifecycle.md](../bot-lifecycle.md)).
- Delete is deliberately a **no-op** (returns 204) for missing or cross-tenant credentials rather than a 404, so callers cannot probe credential existence across tenants (comment in `credential.service.ts`).
- `BotService` only resolves the **active** credential (`getActiveByBot`); start/stop/join/leave/me/messages/users endpoints return `400 "Bot has no active credential"` when none is active.
