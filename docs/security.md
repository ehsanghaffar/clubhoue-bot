# Security

Security measures implemented in the MVP. Also see the repo `SECURITY.md` for the vulnerability reporting policy.

## Authentication

- **Legacy `/api`:** now authenticates via the **same tenant-resolution mechanism as `/v1`** — the `x-api-key` must resolve to an active tenant (`TenantService.findByApiKey`), establishing `req.tenant`. The old static `requireApiKey` (which only matched `API_KEY`) was removed so the legacy path can no longer bypass the tenant isolation boundary.
- **`/v1`:** `x-api-key` resolves to an **active tenant** (`TenantService`), and a tenant context is attached to the request.

## Tenant isolation

All resource access is tenant-scoped **at both the authorization boundary and the repository layer**:

- **Controllers + middleware:** `/v1` resource access goes through authorization loaders (`requireBot`, `requireRoom`, `requireCredential`); the legacy `/api` path establishes `req.tenant` via `authentication` + `tenantContext`. A resource belonging to another tenant returns `404` (no existence disclosure).
- **Defense in depth — repositories:** every tenant-owned mutation (`update`, `delete`) on bots, rooms, and credentials now **requires `tenantId` as a parameter** and scopes the query by `{ _id, tenantId }`. A cross-tenant write matches nothing. Reads prefer the `findByIdAndTenant` family. This ensures another internal service cannot bypass the controller and reach another tenant's data.
- **Credential deletion** is a non-disclosure no-op for a missing or cross-tenant credential (returns void, not 404) so callers cannot probe credential existence across tenants.

Integration tests cover the full cross-tenant matrix (read/update/delete across bot, room, credential).

## Credentials at rest

- Platform tokens are encrypted with **AES-256-GCM** before persistence (`src/core/credentials/credential-encryption.ts`); envelopes are JSON `{ v, iv, tag, data }` and tampering is detectable via the auth tag.
- The key comes from `CREDENTIAL_ENCRYPTION_KEY` (64-char hex used directly, otherwise scrypt-stretched to 32 bytes).
- **Production enforcement:** if `NODE_ENV=production` and the key is missing, startup **fails** (`getMissingEnvVars` + the encryption module throw). There is no silent fallback to a known key in production. Outside production, an unset key falls back to a documented development-only key with a warning.
- **Key rotation / loss:** rotating the key makes previously-encrypted credentials unrecoverable (envelopes are encrypted with the key that was set when they were written). Losing the key means the encrypted credentials can never be decrypted. See [`.env.example`](../.env.example) and [`docs/deployment.md`](deployment.md) for the required format.
- Ciphertext is **never returned** by the API; the only plaintext boundary is `BotService.createAdapter` just before an adapter is built.

## Input validation & abuse

- Request bodies are validated with Joi (`validateBody`) on create/update routes.
- Rate limiting: 100 requests/minute per IP on both `/api` and `/v1` (`express-rate-limit`); sensitive legacy actions get a stricter limiter.
- The bot's own messages are suppressed in AI automation (no self-echo loops).

## Moderation before AI

The event pipeline runs a **moderation stage before automation/AI** (`src/core/moderation/moderation-stage.ts`). A blocked message (blocked user, blocked keyword, or per bot+room+user rate limit) returns `block` and never reaches the AI rules or the usage stage. Moderation is gated by each room's `moderationEnabled` setting (default off).

## API docs exposure

`/api-docs` (Swagger UI) is **intentionally public**: it serves only the route/parameter schema generated from source comments and exposes no credentials, secrets, tenant data, or stack traces. The raw OpenAPI document at `/swagger.json` is protected by the API key. This is an accepted trade-off for development usability (protecting `/api-docs` would break the UI's static-asset loading without the custom header).

## Error handling

The global error handler normalizes errors into `{ "error": { "type", "message" } }` and prevents internal details/stack traces from leaking to clients.

## Supply chain

- CI runs `pnpm audit`; **critical** vulnerabilities fail the build (high+ are surfaced).
- `pnpm-lock.yaml` is committed; CI installs with `--frozen-lockfile`.
- Dependency tree is currently clean (0 advisories at all severities).

## Containers & secrets

- Multi-stage Dockerfile, runtime runs as the non-root `node` user.
- Secrets are injected at runtime via `.env.production` — never baked into the image (`.dockerignore` excludes `.env*`).
- `.env.production` is gitignored; `.env.example` documents the required variables (including `CREDENTIAL_ENCRYPTION_KEY`) without real values.

## Deployment topology

- The production compose runs a **single app process** (`api` + `mongo`). There is no separate worker and no Redis in the MVP — Redis and the worker are future infrastructure and are not provisioned because nothing in the MVP uses them.

## See also

- [`docs/deployment.md`](deployment.md) — environment variables and CI.
- [`docs/platforms.md`](platforms.md) — the credential/decryption boundary.
