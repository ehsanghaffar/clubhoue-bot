# Deployment

How to run the platform locally, in Docker, and how CI validates it.

## Local development

Requires Node.js 22 and pnpm 10 (the repo pins `packageManager: pnpm@10.0.0`).

```bash
pnpm install
cp .env.example .env      # fill in API_KEY, OPENAI_API_KEY, etc.
pnpm dev                  # nodemon + tsx (auto-reload)
pnpm build && pnpm start  # compiled production run
pnpm test                 # vitest
```

Useful scripts: `pnpm typecheck`, `pnpm lint`, `pnpm build` (`tsc` → `dist/`), `pnpm start` (`node dist/server.js`), `pnpm start:worker` (`node dist/worker.js`).

## Docker

A multi-stage `Dockerfile` (build + slim runtime) produces a non-root image with a healthcheck.

**Development** (app + MongoDB):

```bash
docker compose up -d
# App:  http://localhost:4000
# Mongo: mongodb://club_database:27017/clubhouse (host port 27020)
```

**Production** (api + worker + mongo + redis):

```bash
cp .env.example .env.production   # fill in real secrets
docker compose -f docker-compose.prod.yml up -d --build
```

| Service | Role |
| --- | --- |
| `api` | HTTP API on port `4000`, healthcheck on `/health` |
| `worker` | Background worker process (`node dist/worker.js`) |
| `mongo` | MongoDB 6, persistent volume |
| `redis` | Redis 7, persistent volume (reserved for the Redis-backed queue upgrade path) |

API and worker share one image. Keys and credentials are injected at runtime via `.env.production` and are **never** baked into the image.

## Worker architecture

- **MVP (single process):** the API process embeds the worker; bot room loops and scheduling run in-process. Queue jobs use the in-memory queue.
- **Production:** a standalone worker process (`src/worker.ts` → `dist/worker.js`) boots the same core pipeline (DB, tenant bootstrap, event pipeline, `botManager.startAll`, scheduler) with no HTTP server.
- **Upgrade path (documented):** Redis-backed queue (BullMQ) when horizontal scaling is needed. The `JobQueue` abstraction and `Scheduler` are already in place.

## Environment variables

See `.env.example` for the full list. The key ones:

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `PORT` | No | `4000` | HTTP port |
| `API_KEY` | **Yes** | — | Legacy API key; server won't boot without it |
| `MONGODB_URL` | **Yes** | `mongodb://127.0.0.1:27017/clubhouse` | MongoDB connection string |
| `OPENAI_API_KEY` | **Yes** | — | OpenAI key for the chatbot/AI |
| `AGORA_KEY` / `PUBNUB_PUB_KEY` / `PUBNUB_SUB_KEY` | **Yes** | — | Clubhouse integration keys |
| `CREDENTIAL_ENCRYPTION_KEY` | Prod | — | 64-char hex (or any value, scrypt-stretched); must be set in production |
| `INVITE_ALLOW_LIST` | No | — | Comma-separated user ids allowed to request a stage invite |
| `OPENAI_MODEL`, `OPENAI_MAX_TOKENS`, `OPENAI_TEMPERATURE` | No | `gpt-4o` / `150` / `0.7` | AI defaults |
| `LOG_LEVEL` | No | `info` | Winston log level |

## CI

`.github/workflows/ci.yml` runs on every push and pull request:

```text
install → typecheck → lint → test → build → dependency audit
```

- `checks` job: typecheck, lint, test, build.
- `dependency-audit` job: `pnpm audit`; high-severity advisories are surfaced, **critical** vulnerabilities fail the run.

Configure branch protection on `main`/`develop` to require both jobs so failing code cannot be merged.
