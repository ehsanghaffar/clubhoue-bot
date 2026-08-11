# Security

Security measures implemented in the MVP. Also see the repo `SECURITY.md` for the vulnerability reporting policy.

## Authentication

- **Legacy `/api`:** every route is protected by `requireApiKey` (validates the `x-api-key` header against `API_KEY`).
- **`/v1`:** `x-api-key` resolves to an **active tenant** (`TenantService`), and a tenant context is attached to the request.

## Tenant isolation

All `/v1` resource access is tenant-scoped through authorization loaders (`requireBot`, `requireRoom`, `requireCredential`). A bot, room, or credential belonging to another tenant returns `404` (no existence disclosure). Integration tests cover cross-tenant isolation.

## Credentials at rest

- Platform tokens are encrypted with **AES-256-GCM** before persistence (`src/core/credentials/credential-encryption.ts`); envelopes are JSON `{ v, iv, tag, data }` and tampering is detectable via the auth tag.
- The key comes from `CREDENTIAL_ENCRYPTION_KEY` (64-char hex used directly, otherwise scrypt-stretched to 32 bytes). If unset, a documented development-only key is used and a warning is logged — **production must set it**.
- Ciphertext is **never returned** by the API; the only plaintext boundary is `BotService.createAdapter` just before an adapter is built.

## Input validation & abuse

- Request bodies are validated with Joi (`validateBody`) on create/update routes.
- Rate limiting: 100 requests/minute per IP on both `/api` and `/v1` (`express-rate-limit`); sensitive legacy actions get a stricter limiter.
- The bot's own messages are suppressed in AI automation (no self-echo loops).

## Error handling

The global error handler normalizes errors into `{ "error": { "type", "message" } }` and prevents internal details/stack traces from leaking to clients.

## Supply chain

- CI runs `pnpm audit`; **critical** vulnerabilities fail the build (high+ are surfaced).
- `pnpm-lock.yaml` is committed; CI installs with `--frozen-lockfile`.
- Dependency tree is currently clean (0 advisories at all severities).

## Containers & secrets

- Multi-stage Dockerfile, runtime runs as the non-root `node` user.
- Secrets are injected at runtime via `.env.production` — never baked into the image (`.dockerignore` excludes `.env*`).
- `.env.production` is gitignored; `.env.example` documents the required variables without real values.

## See also

- [`docs/deployment.md`](deployment.md) — environment variables and CI.
- [`docs/platforms.md`](platforms.md) — the credential/decryption boundary.
