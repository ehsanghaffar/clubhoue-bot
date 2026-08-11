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
| 13 | Redis / deduplication | ✅ (message dedup implemented; Redis-backed queue is the documented upgrade path) |
| 14 | Worker architecture | ✅ (queue abstraction + embedded worker; standalone worker + Redis/BullMQ documented for prod) |
| 15 | Usage tracking | ✅ |
| 16 | Basic analytics | ✅ |
| 17 | Public /v1 API | ✅ |
| 18 | Integration tests | ✅ |
| 19 | Docker production setup | ✅ |
| 20 | CI hardening | ✅ |

Documentation (spec §31) and the Definition of Done (spec §32) are also complete.

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

- 141 tests / 19 files (unit + integration + platform + Definition of Done), run with Vitest.
- CI enforces typecheck, lint, test, build, and a dependency audit (critical vulnerabilities fail).

## See also

- [`docs/architecture.md`](architecture.md)
- [`docs/deployment.md`](deployment.md)
- The original plan: `docs/plans/2026-08-11-ai-community-platform-mvp.md`
