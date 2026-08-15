# Deployment

This document describes how the application is built and deployed as it exists today. Deployment is **Docker-based** with a single application runtime plus MongoDB.

## Containers / services

### `docker-compose.prod.yml` — production

Two services:

| Service | Image | Purpose |
|---|---|---|
| `api` | built from `Dockerfile` (tagged `clubhouse-full-api:prod`) | The full application: HTTP server + BotManager + event processing in one process |
| `mongo` | `mongo:6` | MongoDB with a persistent volume `mongo_data` |

- `api` sets `NODE_ENV=production` and `MONGODB_URL=mongodb://clubhouse_mongo:27017/clubhouse`, and reads remaining secrets from `env_file: .env.production`.
- `api` waits for `mongo` to be healthy (`depends_on: condition: service_healthy`); `mongo` uses `mongosh` ping as its healthcheck.
- Port mapping `4000:4000` (HTTP).
- `api` also has its own container healthcheck hitting `http://127.0.0.1:4000/health`.
- The compose file explicitly documents the **single-runtime MVP**: the `api` service is the only process that owns a live BotManager runtime. There is **deliberately no worker service** — [`src/worker.ts`](../src/worker.ts) is future infrastructure and must not run alongside the API in this MVP. Redis is likewise **not provisioned** (nothing in the MVP uses it).

### `docker-compose.yml` — development

Only the `club_database` service is active: a `mongo:6` container on port `27017` with a named volume. The `club` app service is **entirely commented out** — dev is expected to run the app directly on the host (see README "Running Locally") against this Mongo.

## Docker image (`Dockerfile`)

Multi-stage, `node:22-alpine`:

1. **Builder**: enables pnpm via corepack (`pnpm@10.0.0`), `pnpm install --frozen-lockfile`, copies source, runs `pnpm run build` (`tsc`).
2. **Runner**: sets `NODE_ENV=production`, copies `package.json`, `pnpm-lock.yaml`, `dist/`, and `start.sh` from the builder, installs **only** production deps (`pnpm install --prod --frozen-lockfile`), runs as the non-root `node` user, `EXPOSE 4000`, `HEALTHCHECK` on `/health`, `CMD ["./start.sh"]`.

`.dockerignore` excludes `.git`, `node_modules`, `dist`, all `.env*`, `profile.json`, `logs`, IDE files, and coverage — so no secrets can be baked into the image.

## Startup entrypoint (`start.sh`)

`NODE_ENV == production` → `pnpm start` (`node dist/server.js`); otherwise → `pnpm dev`. So in the production image the compiled `dist/server.js` runs.

## Environment variables

See [configuration.md](./configuration.md) for the full reference. In production at least these are required (from [`environment.ts`](../src/config/environment.ts)):

- `API_KEY`, `OPENAI_API_KEY`, `MONGODB_URL`, `AGORA_KEY`, `PUBNUB_PUB_KEY`, `PUBNUB_SUB_KEY` — required in all environments.
- `CREDENTIAL_ENCRYPTION_KEY` — required when `NODE_ENV=production`.

`.env.production` is mounted via `env_file` (created from `.env.example` — see compose header comment).

## Ports and health checks

- HTTP: `4000` (configurable via `PORT`, default 4000).
- Mongo: `27017` inside the compose network (`mongo` is not exposed to the host in the production compose file).
- Health: `GET /health` returns `{ status: 'ok', uptime }` (see [runtime.md](./runtime.md)).

## Process model

One application process. The single `api` process owns: the HTTP server, the BotManager (room loops, active-ping timers), and event processing. See [runtime.md](./runtime.md) and [architecture.md](./architecture.md).
