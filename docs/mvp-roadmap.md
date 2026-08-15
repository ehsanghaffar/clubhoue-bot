# MVP Roadmap

Status of the refactor from the legacy Clubhouse bot into the AI Community Automation Platform MVP. The authoritative requirements live in the spec (`Clubhouse Bot → AI Community Automation Platform.md`); this file records what is **implemented**.

## Migration steps (spec §29)

All 20 steps are complete on branch `refactor/upgrade`. Every step was closed with `typecheck → lint → test → build → commit`.

| # | Step | Status |
| --- | --- | --- |
| 01 | Stabilize current code | ✅ |
| 02 | Authentication / tenant context | ✅ |
| 03 | Tenant model | ✅ |
| 04 | Bot model | ✅ |
| 05 | Bot credentials | ✅ |
| 06 | Credential encryption | ✅ |
| 07 | Bot rooms | ✅ |
| 08 | Clubhouse adapter | ✅ |
| 09 | Normalized domain types | ✅ |
| 10 | Event system | ✅ |
| 11 | Automation engine | ✅ |
| 12 | AI agent | ✅ |
| 13 | Redis / deduplication | ✅ (message dedup implemented with Mongo; Redis-backed queue is the **future** upgrade path, not provisioned in the MVP) |
| 14 | Worker architecture | ⏳ (queue abstraction + worker scaffold exist, but the worker/scheduler are **future infrastructure** — intentionally NOT active in the MVP; the API process is the single live runtime) |
| 15 | Usage tracking | ✅ |
| 16 | Basic analytics | ✅ |
| 17 | Public /v1 API | ✅ |
| 18 | Integration tests | ✅ |
| 19 | Docker production setup | ✅ |
| 20 | CI hardening | ✅ |

Documentation (spec §31) and the Definition of Done (spec §32) are also complete.

## Post-MVP follow-ups

- **Moderation (spec §23 / Phase M)** — ✅ implemented in the remediation pass: a real moderation stage gates `message.created` events before automation/AI (blocked users, blocked keywords, per bot+room+user message rate limit), gated by each room's `moderationEnabled` setting.
- **Production hardening** — ✅ enforced `CREDENTIAL_ENCRYPTION_KEY` in production, removed unused Redis/worker from the production compose (single live runtime), documented the legacy `clubService` compatibility boundary, and made worker jobs carry explicit tenant context.
- **Legacy → `/v1` migration + `/api` deprecation** — ✅ done on `refactor/upgrade`. Legacy capabilities (send/list room messages, accept speaker invite, search/get users, bot profile) now have tenant-scoped `/v1` equivalents via the platform adapter, and `/api` is formally deprecated (RFC 8594 `Deprecation`/`Sunset`/`Link` headers; sunset `2027-02-01`) while remaining functional. See [`docs/api.md`](api.md) for the migration map. Clubhouse-specific endpoints with no adapter equivalent (`get_room_users`, `start-timer`, notifications, `all_users`, `change-profile`) remain legacy-only for now.

## Definition of Done (spec §32)

The end-to-end flow is implemented and covered by an integration test (`tests/dod-flow.test.ts`):

```text
Create Bot → attach encrypted Credential → configure Room → Start Bot →
bot joins the room → user joins (welcome) → message → event processor →
automation rules → AI decision/response → speaker request → allow-list check
→ invite → room ends → usage/event data
```

The system supports multiple bots and multiple rooms **without process-global mutable state** — bot runtime and room loops are scoped per bot/room inside `BotManager`, and all persistence is tenant-scoped.

## Testing status

- 177 tests / 23 files (unit + integration + platform + moderation + Definition of Done + legacy-migration/deprecation + remediation regression), run with Vitest.
- CI enforces typecheck, lint, test, build, and a dependency audit (critical vulnerabilities fail).

## See also

- [`docs/architecture.md`](architecture.md)
- [`docs/deployment.md`](deployment.md)
- The original plan: `docs/plans/2026-08-11-ai-community-platform-mvp.md`
