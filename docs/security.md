# Security

This document summarizes the security properties of the application **as implemented today**, and clearly separates *implemented protections* from *operational recommendations*.

## Implemented protections

### Authentication (API key)

- Every `/v1` route requires the `x-api-key` header (`authentication` middleware in [`src/api/middleware/authentication.ts`](../src/api/middleware/authentication.ts)).
- The key is resolved to a tenant via `TenantService.findByApiKey`.
- Missing key → 401 `UNAUTHORIZED "Missing API key"`; unknown key **or suspended tenant** → 401 `UNAUTHORIZED "Invalid API key"`.
- The tenant is attached to `req.tenant` and a `tenantContext` guard ensures it exists before handlers run.

### Tenant isolation

- Every model carries `tenantId`; all repositories scope queries by tenant (see [database.md](./database.md)).
- Ownership middleware (`requireBot`, `requireRoom`, `requireCredential` in [`src/api/middleware/authorization.ts`](../src/api/middleware/authorization.ts)) loads resources by `id + tenantId`. A resource that exists but belongs to another tenant resolves to **404 `NOT_FOUND`** — never 403 — so cross-tenant existence is not leaked.
- Verified by `authorization.test.ts`, `http-tenant-isolation.test.ts`, and `cross-tenant-security.test.ts`.

### Credential encryption

- Clubhouse credential tokens are encrypted at rest with **AES-256-GCM** before storage; only the encrypted envelope is persisted (see [security/credentials.md](./security/credentials.md)).
- API responses strip the encrypted token via `toPublicCredential` (see [api.md](./api.md)).
- `CREDENTIAL_ENCRYPTION_KEY` is **required in production**; a `DEV_ONLY_KEY` fallback is used outside production (production throws if unset).

### Secret handling

- All configuration comes from environment variables (see [configuration.md](./configuration.md)).
- `.dockerignore` excludes `.env*` and `profile.json` so secrets cannot be baked into images (see [deployment.md](./deployment.md)).
- Plaintext secrets are never written to logs by the application.

### Rate limiting

- `express-rate-limit` is applied to the `/v1` router: **100 requests / 60 s window** per client, responding `429` `RATE_LIMITED` (see [app.ts](../src/app.ts)).
- A separate **message rate limit** applies to AI-triggered `message.created` processing (default 10 / 60 s per room+user, in-memory — see [moderation.md](./moderation.md)).

### Input validation

- All request bodies are validated with Joi schemas (`abortEarly: false`) before handlers run; invalid input → 400 `VALIDATION_ERROR` (see [api.md](./api.md), [error-handling.md](./error-handling.md)).
- Length limits are enforced (e.g. bot name 1–100, message 1–2000, room id 1–200).

### Container security

- Production image runs as the non-root `node` user; only production dependencies are installed; `init: true` in the prod compose file (see [deployment.md](./deployment.md)).

### Dependency audit (CI)

- CI runs `pnpm audit` and **fails on any critical vulnerability**; high+ advisories are surfaced but non-blocking (see [ci.md](./ci.md)).

## Operational recommendations (not enforced by code)

These are *not* implemented protections — they are deployment/branch-management practices the repo's comments recommend:

- **Branch protection** on `main`/`develop` requiring the CI `checks` and `dependency-audit` jobs is recommended by the workflow comments but is **not configured in this repository** (see [ci.md](./ci.md)).
- **Network isolation / TLS termination / firewall rules** for the exposed `4000` port are outside the application code.
- **Key rotation / credential expiry enforcement** — the application does not enforce credential rotation or expiry; `BotCredential.status` supports `revoked` but the API does not auto-rotate.
- **Secure hosting of `CREDENTIAL_ENCRYPTION_KEY` and `API_KEY`** (secret manager) is an operational concern; the app expects them in the environment.

## Security-relevant notes / limitations

- The in-memory stores (AI cooldown, message rate limiter) are per-process and reset on restart (see [limitations.md](./limitations.md)).
- The `SECURITY.md` file in the repo root is boilerplate placeholder text, not a live security policy (see [limitations.md](./limitations.md)).
- `src/middlewares/api-key.ts` (a legacy `requireApiKey` middleware) exists but is **unused** — authentication is handled by `src/api/middleware/authentication.ts`.
