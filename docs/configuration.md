# Configuration

This document lists the environment variables the application actually reads, derived from [`src/config/environment.ts`](../src/config/environment.ts), the modules that read `process.env`, and [`.env.example`](../.env.example).

The single source of truth for *required* variables is [`src/config/environment.ts`](../src/config/environment.ts):

- `REQUIRED_ENV_VARS` — the application refuses to boot (exit 1) if any of these is missing.
- `PROD_REQUIRED_ENV_VARS` — additional variables required when `NODE_ENV === 'production'`.

## Boot Validation

```text
startup
 ↓
getMissingEnvVars() reads REQUIRED_ENV_VARS + (if NODE_ENV=production) PROD_REQUIRED_ENV_VARS
 ↓
if any missing → log each missing var and process.exit(1)
```

## Required Environment Variables

These are required in all environments (boot fails without them):

| Variable | Purpose | Security |
| --- | --- | --- |
| `API_KEY` | API key for the default bootstrap tenant (`ensureDefaultTenant`). Also used by the legacy `src/middlewares/api-key.ts` middleware (not imported by any route). | Secret |
| `OPENAI_API_KEY` | Key for the OpenAI / OpenAI-compatible AI provider. | Secret |
| `MONGODB_URL` | Mongo connection string. | Secret (may embed credentials) |
| `AGORA_KEY` | Declared required by `environment.ts`. **Not read by any other module** in the current source (see note below). | — |
| `PUBNUB_PUB_KEY` | Declared required by `environment.ts`. **Not read by any other module** in the current source (see note below). | — |
| `PUBNUB_SUB_KEY` | Declared required by `environment.ts`. **Not read by any other module** in the current source (see note below). | — |

> **Note on AGORA/PubNub:** these three variables are in `REQUIRED_ENV_VARS`, so boot fails without them. However, a grep of the source tree shows **no module reads them** — they appear to be a legacy requirement carried over from an older realtime architecture. Because they are required at boot, a deployment must still set them. This is documented in [limitations.md](./limitations.md) as an observed finding, not a bug fix.

## Production-Only Required Variables

Additional requirement when `NODE_ENV === 'production'`:

| Variable | Purpose | Security |
| --- | --- | --- |
| `CREDENTIAL_ENCRYPTION_KEY` | AES-256-GCM encryption key for credential storage. 64-char hex used directly; any other value is scrypt-stretched to 32 bytes. In production, boot fails if unset (a known dev-only key is never silently used). | **Secret — losing it makes encrypted credentials unrecoverable** |

## Optional / Runtime-Tuned Variables

| Variable | Default | Read by | Purpose |
| --- | --- | --- | --- |
| `PORT` | `4000` | `server.ts`, `app.ts` | HTTP listen port; also embedded into the served OpenAPI spec `servers[0].url` at app-creation time. |
| `NODE_ENV` | — | `environment.ts`, `start.sh`, `server.ts`, `logger.ts`, `error-handler.ts`, `action-idempotency.ts`, `event-processor.ts` | Environment selector. `production` requires `CREDENTIAL_ENCRYPTION_KEY`, hides error internals, enables file logging. |
| `LOG_LEVEL` | `'info'` | `logger.ts` | Winston log level. |
| `SALT` | `10` | not read in source (only present in `.env.example`) | See note below. |
| `OPENAI_MODEL` | `'gpt-4o-mini'` | `bot.types.ts` (DEFAULT_AI_CONFIG), `openai.provider.ts` | Default AI model when a bot does not override `aiConfig.model`. |
| `OPENAI_TEMPERATURE` | `0.4` | `bot.types.ts` | Default AI temperature. |
| `OPENAI_MAX_TOKENS` | `150` | `bot.types.ts` | Default max output tokens. |
| `ROOM_SYNC_INTERVAL_MS` | `15000` | `bot-manager.ts` | Room message sync polling interval. |
| `ACTIVE_PING_INTERVAL_MS` | `180000` (clamped to 120000–300000) | `bot-manager.ts` | Interval for Clubhouse `active_ping`. |
| `JOIN_PING_RETRY_ATTEMPTS` | `3` | `bot-manager.ts` | Retry attempts for join-time ping. |
| `JOIN_PING_RETRY_BASE_DELAY_MS` | `1000` | `bot-manager.ts` | Base delay for join-ping retries (exponential backoff `2^(attempt-1)`). |
| `INVITE_ALLOW_LIST` | — | `default-engine.ts` | Comma-separated allowlist of users who may be auto-invited to the speaker stage. |
| `AI_PROVIDER` | `'openai'` | `provider-resolver.ts` | AI provider selection: `'openai'` or `'openai-compatible'`. |
| `AI_BASE_URL` | — | `openai-compatible.provider.ts` | Custom base URL for the OpenAI-compatible provider. |
| `AI_API_KEY` | `OPENAI_API_KEY` | `provider-resolver.ts` | API key override for the AI provider (falls back to `OPENAI_API_KEY`). |
| `AI_MODEL` | `OPENAI_MODEL ?? 'gpt-4o-mini'` | `provider-resolver.ts` | Model override for the AI provider. |

> **Note on `SALT`:** `SALT=10` appears in `.env.example` but is not read anywhere in the source. It is documented here only because it is shipped in `.env.example`; it has no effect on the current implementation.

## AI Provider Configuration

The AI provider selection flow (see [ai.md](./ai.md)):

- `AI_PROVIDER` (default `'openai'`) selects the provider.
- `'openai'` → OpenAI SDK client, using `AI_API_KEY` or `OPENAI_API_KEY` and `AI_MODEL`/`OPENAI_MODEL`.
- `'openai-compatible'` → OpenAI-compatible client with `AI_BASE_URL`.
- Timeouts and retries are fixed in code: `REQUEST_TIMEOUT_MS = 25_000`, `MAX_ATTEMPTS = 2`, `RETRY_BASE_DELAY_MS = 1000` (not env-configurable).

## `.env.example`

The shipped [`.env.example`](../.env.example) documents: `PORT`, `API_KEY`, `SALT`, `NODE_ENV`, `MONGODB_URL`, `OPENAI_API_KEY`, `AGORA_KEY`, `PUBNUB_PUB_KEY`, `PUBNUB_SUB_KEY`, `INVITE_ALLOW_LIST`, `OPENAI_MODEL`, `OPENAI_MAX_TOKENS`, `OPENAI_TEMPERATURE`, `ROOM_SYNC_INTERVAL_MS` (commented), `CREDENTIAL_ENCRYPTION_KEY` (commented, with guidance), `LOG_LEVEL`.

## Secrets Handling

- Never commit a real `API_KEY`, `OPENAI_API_KEY`, `MONGODB_URL`, or `CREDENTIAL_ENCRYPTION_KEY`.
- The `.env` file is git-ignored; `.env.example` is committed as a template.
- Production deployments set secrets via `.env.production` (see [deployment.md](./deployment.md)).
