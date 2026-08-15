# Error Handling

This document describes how errors are represented and handled across the application.

## Error classes

- [`src/utils/errors.ts`](../src/utils/errors.ts) defines `AppError` (with `type`, `statusCode`, `isOperational`) and `ErrorTypes`:
  `VALIDATION_ERROR`, `NOT_FOUND`, `UNAUTHORIZED`, `FORBIDDEN`, `INTERNAL_ERROR`, `BAD_REQUEST`.
  Convenience constructors: `createValidationError` (400), `createNotFoundError` (404), `createUnauthorizedError` (401), `createForbiddenError` (403), `createInternalError` (500), `createBadRequestError` (400).

## Global error middleware

[`src/middlewares/error-handler.ts`](../src/middlewares/error-handler.ts) is registered last in `createApp()` and handles, in order:

| Condition | HTTP | `error.type` | Notes |
|---|---|---|---|
| `err instanceof AppError` | `err.statusCode` | `err.type` | `{ error: { type, message } }` |
| `err.name === 'ValidationError'` | 400 | `VALIDATION_ERROR` | Includes `details` (Mongoose/Joi error details) |
| `err.code === 11000` | 409 | `DUPLICATE_ERROR` | Mongo duplicate-key |
| `JsonWebTokenError` / `TokenExpiredError` | 401 | `UNAUTHORIZED` | |
| any other error | `statusCode ?? 500` | `INTERNAL_ERROR` | message is `'An unexpected error occurred.'` in production; raw `err.message` otherwise; 5xx errors are logged |

All responses use the envelope `{ error: { type, message, ... } }` — never a plain string.

## Validation errors

- Request-body validation uses Joi via `validateBody` in [`src/middlewares/validate.ts`](../src/middlewares/validate.ts) (`abortEarly: false`, joined messages). It produces an `AppError(VALIDATION, 400, ...)`.
- API-level validation schemas live in `src/api/schemas/` (see [api.md](./api.md) for per-endpoint constraints).

## Authentication / authorization errors

- `createUnauthorizedError` (401) for missing/invalid API key; `createForbiddenError` (403) for suspended tenants (see [security/authentication.md](./security/authentication.md)).
- Cross-tenant access is deliberately handled as 404 `NOT_FOUND`, not 403 — see [security.md](./security.md).

## Platform (Clubhouse) errors

[`src/platforms/clubhouse/errors.ts`](../src/platforms/clubhouse/errors.ts) classifies HTTP statuses into `ClubhouseFailureKind`:

| Status | Kind | `retryable` | `authenticationFailure` |
|---|---|---|---|
| 401, 403 | `authentication` | false | true |
| 404 | `not_found` | false | false |
| 409 | `conflict` | false | false |
| 429 | `rate_limited` | true | false |
| 5xx | `transient` | true | false |
| 408 | `timeout` | true | false |
| other | `request` | false | false |

`classifyNetworkError` maps `AbortError`/`TimeoutError` → `timeout`, and network-level failures → `network` (retryable). `ClubhouseApiError` carries `operation`, `status`, `kind`, and the three flags above. The adapter layer wraps them in `AdapterError` ([`src/platforms/adapter.ts`](../src/platforms/adapter.ts)). BotManager reacts to 401/403 from the active ping as a **credential auth failure** (see [bot-lifecycle.md](./bot-lifecycle.md)).

## AI provider errors

[`src/core/ai/ai.types.ts`](../src/core/ai/ai.types.ts) defines `AiProviderFailureKind`: `timeout`, `rate_limited`, `transient`, `authentication`, `invalid_request`, `permanent`. However, the concrete providers (`openai`, `openai-compatible`) do **not throw** on failure — they classify the error with `isTransientError` and return `''` (see [ai/providers.md](./ai/providers.md)). So `AiProviderError` is the declared error type, not something thrown at runtime today.

## Database errors

- Mongo duplicate-key (`code 11000`) → 409 `DUPLICATE_ERROR` via the global handler (e.g. unique bot name, unique room `externalRoomId`, dedup-key race).
- Mongoose `ValidationError` (name check) → 400 `VALIDATION_ERROR`.
- Connection failures at boot fail startup (Mongo connect happens before services start).

## Logging

The error handler logs 5xx unhandled errors (and uses the Winston logger — see [runtime.md](./runtime.md)). 4xx AppErrors are not logged by the handler.
