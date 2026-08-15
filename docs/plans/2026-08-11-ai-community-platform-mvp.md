# AI Community Automation Platform — MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor the existing Clubhouse bot into a production-oriented, multi-tenant, multi-bot, multi-room AI Community Automation Platform MVP — preserving the existing Clubhouse integration while isolating it behind a platform adapter.

**Architecture:** `API → Bot Management (Bots/Rooms/Users) → Event/Automation Engine (Welcome/AI/Moderation) → Platform Adapter → Clubhouse`. Core domain (bot, room, event, automation, AI, usage) has zero dependency on Clubhouse APIs; only `src/platforms/clubhouse/*` knows Clubhouse.

**Tech Stack:** TypeScript (strict, ESM, ES2022), Express 5, Mongoose 9, OpenAI SDK, Joi, Winston, Vitest, Node 22, pnpm. Redis/BullMQ = documented upgrade path (queue abstraction in place, in-memory driver for MVP).

**Baseline (verified 2026-08-11):** typecheck ✓ lint ✓ test (12) ✓ build ✓ on branch `refactor/upgrade`.

---

## Migration sequence (phase order from spec §29)

Each phase ends with: typecheck → lint → test → build → commit.

### Phase A — Stabilize + auth consistency (spec §5, §0)
- Enable `requireApiKey` on legacy `/api` routes (currently commented out — security gap).
- Extract `createApp(options)` factory (`src/app.ts`) so tests can inject dependencies.
- Verify no regressions.

### Phase B — Domain types + models + repositories
- Normalized types: `src/core/types.ts` (Room/User/Message), `src/core/{bots,rooms,credentials,tenants,events,automation,ai,usage}/*.types.ts`.
- Mongoose models: `src/models/{tenant,bot,botCredential,botRoom,usageEvent,processedMessage,roomMember}.ts`.
- Repository interfaces + Mongoose impls: bots, rooms, credentials, tenants, usage, processedMessage, roomMember.

### Phase C — Tenant + authentication middleware
- `src/api/middleware/{authentication,tenant-context,authorization}.ts`.
- API key → tenant lookup; default tenant bootstrapped from `API_KEY` env.
- TenantService + tests.

### Phase D — Credential encryption
- `src/core/credentials/credential-encryption.ts` (aes-256-gcm).
- `src/core/credentials/credential.service.ts` (create/list/delete, never returns plaintext).
- Tests: round-trip, tamper detection, wrong key.

### Phase E — Clubhouse adapter isolation (spec §10–11)
- Move `agent.ts` → `src/platforms/clubhouse/agent.ts`, `club-api.service.ts` → `src/platforms/clubhouse/api.service.ts`, Clubhouse types → `src/platforms/clubhouse/types.ts`.
- `src/platforms/adapter.ts` — `CommunityPlatformAdapter` interface + `AdapterError`.
- `src/platforms/clubhouse/mappers.ts` — normalize responses → domain types.
- `src/platforms/clubhouse/adapter.ts` — `ClubhouseAdapter` (per-credential, no globals).
- `src/platforms/clubhouse/index.ts` — `createPlatformAdapter(platform, profileData)`.
- Update all legacy imports.

### Phase F — Event system (spec §12)
- `src/core/events/event-bus.ts` (typed publish/subscribe), `event.types.ts`.
- `src/core/events/event-processor.ts` — routes events → moderation → automation.

### Phase G — Automation engine (spec §13)
- `src/core/automation/rule-engine.ts`, `action-dispatcher.ts`, `automation.types.ts`.
- Rules: welcome (`user.joined`), AI Q&A (`message.created`), speaker request (`message.created` + allow-list).
- Preserve legacy `INVITE_ALLOW_LIST` behavior in speaker rule.

### Phase H — AI agent (spec §14–16)
- `src/core/ai/{ai.service,agent.service,prompt.service,ai.types}.ts`.
- Per-bot `aiConfig` (model/temperature/maxOutputTokens/maxResponseLength/trigger/cooldown/personality).
- `AiProvider` interface (OpenAI impl + test fake). Trigger modes: question/mention/prefix/keyword/manual. Cooldown.

### Phase I — Dedup + room sync + bot lifecycle (spec §17, §19)
- `src/infrastructure/deduplication/message-dedup.ts` (interface + Mongo + in-memory).
- `src/core/rooms/room.service.ts` — CRUD + join/leave + sync (fetch msgs → dedup → publish events; track members for welcome).
- `src/core/bots/bot.service.ts` + `bot-manager.ts` — start/stop; per-bot adapter creation from decrypted credential; multi-room loops scoped by `tenantId:botId:roomId`.
- `src/core/rooms/room-member.repository.ts` for welcome tracking.

### Phase J — Usage + analytics (spec §21–22)
- `src/core/usage/usage.service.ts`, `analytics.service.ts`, model, types. Track message_received/sent, ai_request/response, speaker_invite, room_join/leave, automation_triggered.

### Phase K — Queue + workers (spec §18)
- `src/infrastructure/queue/{queue,in-memory-queue,index}.ts`.
- `src/workers/{jobs,handlers,worker,scheduler}.ts` + `src/worker.ts` entry.
- Jobs: process-message, ai-response, active-ping, room-sync, speaker-invite.
- Embedded worker in API (single-process MVP); standalone worker for prod (Redis path documented).

### Phase L — /v1 public API (spec §20)
- `src/api/controllers/{bots,credentials,rooms,usage,tenants}.controller.ts`.
- `src/api/routes/v1.routes.ts` — Bots/Credentials/Rooms/Lifecycle/Usage/Events CRUD + validation + authorization.
- Mount in `createApp`.

### Phase M — Moderation (spec §23)
- Basic moderation: blocked users, blocked keywords, message rate limit, AI cooldown (per bot-room). Pre-pipeline filter.

### Phase N — Tests (spec §25)
- Unit: CredentialEncryption, RuleEngine, AutomationEngine, MessageDedup, AIService, BotService, RoomService, Authorization, TenantContext.
- Integration: createApp with in-memory repos — Bot API, Credential API, Room API, automation pipeline.
- Platform: mock Clubhouse responses (join/leave/send/get msgs/invite/user lookup).

### Phase O — Docker + CI (spec §26–27)
- Dockerfile: api + worker targets. docker-compose: api, worker, mongo, redis. CI: add dependency audit step.

### Phase P — Docs (spec §31)
- `docs/{architecture,api,bot-lifecycle,automation,ai,platforms,deployment,security,mvp-roadmap}.md`.

---

## Definition of Done (spec §32)
Create Bot → attach encrypted Credential → configure Room → Start Bot → bot joins Clubhouse room → user join → welcome → message → event processor → automation → AI decision → AI response → speaker request → allow-list → invite → room ends → usage data. Multiple bots/rooms, no process-global mutable state.

## Guardrails
- No plaintext credentials; no `any`/`@ts-ignore`; controllers thin; platform logic only in adapters; DB behind repositories; no global bot state; validate all input; keep backward-compat legacy endpoints.
