# Authentication

This document describes the actual API-key authentication flow for all `/v1` routes.

## Flow

```
HTTP request
   ↓
x-api-key header read
   ↓
findByApiKey (Mongo, tenants.apiKeys index)
   ↓
tenant found AND status === 'active'?
   ↓
req.tenant attached → tenantContext guard → controllers
```

Implementation: [`src/api/middleware/authentication.ts`](../../src/api/middleware/authentication.ts).

- The `authentication` middleware is applied to **every** `/v1` route (the whole `v1` router) via `createV1Router`.
- The `x-api-key` header value is looked up with `TenantService.findByApiKey` → `TenantRepository.findByApiKey` (an indexed `apiKeys` array lookup).
- On success, `req.tenant` (the resolved tenant) and `req.apiKey` are attached; a `tenantContext` guard then rejects requests where the tenant is missing.

## Failure cases

| Case | HTTP | `error.type` | Message |
|---|---|---|---|
| Missing or empty `x-api-key` | 401 | `UNAUTHORIZED` | `Missing API key` |
| No tenant found for the key | 401 | `UNAUTHORIZED` | `Invalid API key` |
| Tenant exists but `status !== 'active'` (suspended) | 401 | `UNAUTHORIZED` | `Invalid API key` |
| Unexpected internal error during lookup | 500 | `INTERNAL_ERROR` | `Authentication failed` |
| `tenantContext` missing tenant after auth | 401 | `UNAUTHORIZED` | `Tenant context missing` |

> Note: a **suspended tenant is indistinguishable from an invalid key** — both return `401 Invalid API key`. There is no distinct 403 path in the auth middleware.

## Tenant resolution and default tenant

- At boot, `TenantService.ensureDefaultTenant()` creates a tenant named `Default` with `apiKeys: [API_KEY]` if no tenant already owns the configured `API_KEY` (idempotent). This makes the platform usable out of the box with the `API_KEY` env var (see [configuration.md](../configuration.md) and [runtime.md](../runtime.md)).
- Tenant lookups by id/key are treated as **system-level identity operations**, not cross-tenant data access (per the code comment in `tenant.service.ts`).

## Authorization boundary

Authentication only resolves *who* the caller is (the tenant). All subsequent access to bots, rooms, and credentials is tenant-scoped via the ownership middleware (`requireBot`, `requireRoom`, `requireCredential`) and tenant-scoped repositories. Cross-tenant access returns **404 `NOT_FOUND`**, never 403 (see [security.md](../security.md)).

## Rate limiting

The `/v1` router is additionally rate-limited (100 requests / 60 s) before authentication — see [app.ts](../../src/app.ts) and [security.md](../security.md).
