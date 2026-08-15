# CI

This document describes the GitHub Actions workflows in [`.github/workflows/`](../.github/workflows/). Two workflows exist.

## `ci.yml` — Validation pipeline

Triggers: push to `main`/`develop`, all pull requests, and manual `workflow_dispatch`.

Every run uses Node 22 on `ubuntu-latest`, enables pnpm via corepack (`pnpm@10.0.0`), and installs with `pnpm install --frozen-lockfile` (locked, CI-safe).

### `checks` job

Sequential steps, each must pass for the job to be green:

1. **Typecheck** — `pnpm typecheck` (`tsc --noEmit`)
2. **Lint** — `pnpm lint` (`eslint --ext .js,.ts .`)
3. **Test** — `pnpm test` (`vitest run`)
4. **Build** — `pnpm build` (`tsc`)

> Note: `mongo-ownership.test.ts` runs as part of `pnpm test`. It requires a real Mongo; if none of `MONGODB_TEST_URL` / local `mongod` / Docker are available it will fail or skip accordingly (see [testing.md](./testing.md)).

### `dependency-audit` job

- Runs `pnpm audit --audit-level=high` with `continue-on-error: true` — **high+ advisories are surfaced but do not block**.
- Then runs `pnpm audit --audit-level=critical --json` and fails the job if the number of **critical** vulnerabilities is not `0`.

So the audit gate is: **critical = 0 blocks CI; high/medium warnings do not**.

### Concurrency

`concurrency` cancels in-progress runs for the same workflow + ref.

### Branch protection

The workflow comments say branch protection should require the `checks` and `dependency-audit` jobs on `main`/`develop`, but **branch protection is not configured in this repository** (no `.github` branch-protection config). The comment is an operational recommendation, not an enforced rule.

## `update-loc.yml` — Code stats autoupdate

Triggers: push to `main` (and manual).

- Runs `pnpm exec tsx tools/loc.ts`, which regenerates the "lines of code" badge in `README.md`.
- If the README changed, commits `docs: update lines of code [skip ci]` (via `github-actions[bot]`) and pushes.
- Node 20 here (unlike `ci.yml` which uses Node 22).
- Requires `contents: write` permission (granted on this job only).

This workflow does **not** gate anything; it is a housekeeping/maintenance job.
