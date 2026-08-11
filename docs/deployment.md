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

**Production** (api + mongo):

```bash
cp .env.example .env.production   # fill in real secrets (incl. CREDENTIAL_ENCRYPTION_KEY)
docker compose -f docker-compose.prod.yml up -d --build
```

| Service | Role |
| --- | --- |
| `api` | HTTP API on port `4000`; the ONLY live BotManager runtime (room loops, automation, AI, usage), healthcheck on `/health` |
| `mongo` | MongoDB 6, persistent volume |

The MVP is a single-process deployment by design: there is **no separate worker
service** and **no Redis**. Redis and the worker are future infrastructure
(Redis-backed queue / dedup upgrade path) and are deliberately not provisioned
because nothing in the MVP uses them. Keys and credentials are injected at
runtime via `.env.production` and are **never** baked into the image.

## Worker architecture (FUTURE — not active in the MVP)

- **MVP (single process):** the API process owns the live BotManager runtime;
  bot room loops, moderation, automation, and AI run in-process. The queue and
  scheduler are NOT started.
- **Future:** a standalone worker process (`src/worker.ts` → `dist/worker.js`)
  becomes the production runner for a Scheduler → Queue (Redis/BullMQ) → Worker
  architecture. Until then `src/worker.ts` is a stub that must not boot live
  bots. Do not run it alongside the API in this MVP — it would create a second
  live bot runtime.

## Environment variables

See `.env.example` for the full list. The key ones:

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `PORT` | No | `4000` | HTTP port |
| `API_KEY` | **Yes** | — | Legacy API key; server won't boot without it |
| `MONGODB_URL` | **Yes** | `mongodb://127.0.0.1:27017/clubhouse` | MongoDB connection string |
| `OPENAI_API_KEY` | **Yes** | — | OpenAI key for the chatbot/AI |
| `AGORA_KEY` / `PUBNUB_PUB_KEY` / `PUBNUB_SUB_KEY` | **Yes** | — | Clubhouse integration keys |
| `CREDENTIAL_ENCRYPTION_KEY` | **Prod only** | — | 64-char hex (or any value, scrypt-stretched to 32 bytes). **Required in production** — startup fails if missing (no silent dev-key fallback). Losing it makes encrypted credentials unrecoverable |
| `INVITE_ALLOW_LIST` | No | — | Comma-separated user ids allowed to request a stage invite |
| `OPENAI_MODEL`, `OPENAI_MAX_TOKENS`, `OPENAI_TEMPERATURE` | No | `gpt-4o-mini` / `150` / `0.4` | AI defaults (authoritative default in code) |
| `LOG_LEVEL` | No | `info` | Winston log level |

## CI

`.github/workflows/ci.yml` runs on every push and pull request:

```text
install → typecheck → lint → test → build → dependency audit
```

- `checks` job: typecheck, lint, test, build.
- `dependency-audit` job: `pnpm audit`; high-severity advisories are surfaced, **critical** vulnerabilities fail the run.

Configure branch protection on `main`/`develop` to require both jobs so failing code cannot be merged.
