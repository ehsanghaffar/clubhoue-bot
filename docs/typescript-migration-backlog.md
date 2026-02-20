# TypeScript Migration - Detailed Implementation Backlog

## Overview

| Metric | Current State | Target |
|--------|---------------|--------|
| TypeScript Coverage | ~8% (9 TS files) | 100% |
| JavaScript Files | 100 | 0 |
| Total Estimated Effort | - | ~75 hours |

---

## PHASE 0: Infrastructure Setup

### Objective
Configure build tooling and type infrastructure for hybrid JS/TS migration.

| ID | Task | Priority | Hours | Dependencies | Acceptance Criteria |
|----|------|----------|-------|--------------|---------------------|
| T0-01 | Update tsconfig.json for hybrid mode | Critical | 0.5 | None | Config has `allowJs: true`, `checkJs: true`, `target: ES2022`, proper `include`/`exclude` |
| T0-02 | Install missing @types packages | Critical | 0.5 | T0-01 | All dependencies typed: express, cors, mongoose, jsonwebtoken, uuid, qs, joi, form-data |
| T0-03 | Create src/types/index.ts registry | High | 1 | T0-02 | Consolidates existing `.d.ts` files; exports all types |
| T0-04 | Update package.json scripts | Medium | 0.5 | T0-01 | Add `build`, `typecheck` scripts using `tsc` |
| T0-05 | Configure ESLint for strict TS | Medium | 0.5 | T0-02 | `@typescript-eslint` rules active; no `any` warnings |

**Phase 0 Total: 3 hours**

---

## PHASE 1: Entry Point & Configuration

### Objective
Type the application bootstrap and configuration layer.

| ID | Task | Priority | Hours | Dependencies | Acceptance Criteria |
|----|------|----------|-------|--------------|---------------------|
| T1-01 | Create src/types/express.d.ts | Critical | 0.5 | T0-03 | Extends Express Request with `user` property |
| T1-02 | Migrate server.js → server.ts | Critical | 2 | T1-01 | Compiles without errors; app starts successfully |
| T1-03 | Extract bootstrap logic to src/bootstrap.ts | High | 1 | T1-02 | DB connection, service init, signal handlers extracted |
| T1-04 | Migrate src/config/db/db.js → .ts | High | 1 | T1-02 | Mongoose connection typed; returns `mongoose.Connection` |
| T1-05 | Migrate src/config/index.js → .ts | Medium | 1 | T1-04 | Exports typed `Config` interface |
| T1-06 | Migrate src/config/profile/*.js → .ts | Medium | 1.5 | T1-05 | Profile loading typed; async fs operations |

**Phase 1 Total: 7 hours**

---

## PHASE 2: Data Layer (Models)

### Objective
Establish type-safe data models as the "source of truth".

| ID | Task | Priority | Hours | Dependencies | Acceptance Criteria |
|----|------|----------|-------|--------------|---------------------|
| T2-01 | Create src/types/models.ts interfaces | Critical | 1 | T1-06 | `IUser`, `IToken`, `IRoomMessage`, `IRoomUser` defined |
| T2-02 | Migrate src/models/user.js → .ts | Critical | 2 | T2-01 | Schema typed with `IUser`; methods return typed |
| T2-03 | Migrate src/models/token.js → .ts | High | 1.5 | T2-01 | Schema typed with `IToken` |
| T2-04 | Migrate src/models/roomMessage.js → .ts | High | 1.5 | T2-01 | Schema typed with `IRoomMessage` |
| T2-05 | Migrate src/models/roomUser.js → .ts | High | 1.5 | T2-01 | Schema typed with `IRoomUser` |
| T2-06 | Create Model export barrel | Medium | 0.5 | T2-02..T2-05 | `src/models/index.ts` exports all models |

**Phase 2 Total: 8 hours**

---

## PHASE 3: Services Layer

### Objective
Type core business logic and external API integrations.

| ID | Task | Priority | Hours | Dependencies | Acceptance Criteria |
|----|------|----------|-------|--------------|---------------------|
| T3-01 | Create src/types/api.ts for Clubhouse responses | Critical | 2 | T2-06 | All API response interfaces defined |
| T3-02 | Migrate src/lib/httpservice.ts (cleanup) | High | 1 | T3-01 | Remove `any`; use generics properly |
| T3-03 | Refactor clubApiService.js → club-api.service.ts | Critical | 4 | T3-01 | DI pattern; no singleton; all methods typed |
| T3-04 | Migrate channelService.js → .ts | High | 2 | T3-03 | Uses typed `ClubApiService` |
| T3-05 | Migrate openAIService.js → .ts | High | 2 | T3-01 | OpenAI v4 types used; response typed |
| T3-06 | Migrate serviceInitializer.js → .ts | Medium | 1 | T3-03..T3-05 | Returns typed service instances |
| T3-07 | Create services barrel export | Medium | 0.5 | T3-03..T3-06 | `src/services/index.ts` exports all |

**Phase 3 Total: 12.5 hours**

---

## PHASE 4: Helper & Utils

### Objective
Type utility functions and reduce complexity hotspots.

| ID | Task | Priority | Hours | Dependencies | Acceptance Criteria |
|----|------|----------|-------|--------------|---------------------|
| T4-01 | Refactor agent.js → agent.ts | Critical | 3 | T3-01 | Complexity reduced; typed `AgentOptions` interface |
| T4-02 | Migrate src/utils/errors.js → .ts | High | 1 | T0-03 | `AppError` class typed; `ERROR_TYPES` enum |
| T4-03 | Migrate src/utils/logger.js → .ts | High | 1 | T0-03 | Winston logger typed |
| T4-04 | Migrate src/utils/createLogger.js → .ts | Medium | 0.5 | T4-03 | Factory typed |
| T4-05 | Migrate src/utils/messageUtils.js → .ts | Medium | 1 | T3-01 | Message formatting typed |
| T4-06 | Migrate src/utils/fetchRoomMessages.js → .ts | Medium | 1 | T3-01 | Async; returns typed messages |
| T4-07 | Migrate src/utils/calculateCharacters.js → .ts | Low | 0.5 | None | Pure function; typed |
| T4-08 | Migrate src/utils/pingManager.js → .ts | Medium | 1.5 | T3-01 | Map types; interval cleanup typed |
| T4-09 | Migrate src/utils/followUtils.js → .ts | Medium | 1 | T3-01 | Follow operations typed |
| T4-10 | Migrate src/utils/messageCache.js → .ts | Medium | 1 | T3-01 | Cache map typed with TTL |
| T4-11 | Migrate src/utils/index.js → .ts | Low | 0.5 | T4-02..T4-10 | Barrel export |

**Phase 4 Total: 11 hours**

---

## PHASE 5: API Wrappers (src/api/)

### Objective
Migrate 60 API wrapper functions with proper typing.

| ID | Task | Priority | Hours | Dependencies | Acceptance Criteria |
|----|------|----------|-------|--------------|---------------------|
| T5-01 | Create src/api/index.ts barrel with types | High | 1 | T3-01 | Exports all API functions with signatures |
| T5-02 | Batch migrate auth APIs (4 files) | High | 2 | T3-01 | requestMobileAuth, completeMobileAuth, etc. |
| T5-03 | Batch migrate channel APIs (8 files) | High | 3 | T3-01 | getChannels, joinChannel, leaveChannel, etc. |
| T5-04 | Batch migrate user APIs (6 files) | Medium | 2 | T3-01 | getUser, getProfile, searchUsers, etc. |
| T5-05 | Batch migrate event APIs (4 files) | Medium | 1.5 | T3-01 | createEvent, getEvents, editEvent, deleteEvent |
| T5-06 | Batch migrate club APIs (4 files) | Medium | 1.5 | T3-01 | getClub, getClubs, followClub, etc. |
| T5-07 | Batch migrate notification APIs (3 files) | Low | 1 | T3-01 | getNotifications, updateNotifications, etc. |
| T5-08 | Batch migrate remaining APIs (~30 files) | Low | 4 | T3-01 | All other API wrappers migrated |

**Phase 5 Total: 14 hours**

---

## PHASE 6: Routes, Controllers, Middlewares

### Objective
Type HTTP layer with interface-driven handlers.

| ID | Task | Priority | Hours | Dependencies | Acceptance Criteria |
|----|------|----------|-------|--------------|---------------------|
| T6-01 | Create src/types/requests.ts | Critical | 1 | T3-01 | Request/Response interfaces for all endpoints |
| T6-02 | Migrate src/middlewares/auth.js → .ts | Critical | 2 | T4-02, T1-01 | Auth middleware typed; error handling refactored |
| T6-03 | Migrate src/controllers/*.js → .ts | High | 2 | T6-01 | Controllers typed with req/res interfaces |
| T6-04 | Refactor chatbot.routes.js → .ts | Critical | 2 | T3-05, T6-01 | Extract business logic to service |
| T6-05 | Migrate src/routes/channel.routes.js → .ts | High | 1.5 | T6-01 | Route handlers typed |
| T6-06 | Migrate src/routes/channels.routes.js → .ts | High | 2 | T6-01 | Route handlers typed |
| T6-07 | Migrate src/routes/profiles.routes.js → .ts | High | 2 | T6-01 | Replace sync fs with async |
| T6-08 | Migrate src/routes/users.routes.js → .ts | Medium | 1 | T6-01 | Route handlers typed |
| T6-09 | Migrate src/routes/routes.js → .ts | Medium | 0.5 | T6-04..T6-08 | Router barrel typed |
| T6-10 | Delete src/index.esm.js (unused) | Low | 0.1 | T6-09 | File removed |

**Phase 6 Total: 14.1 hours**

---

## PHASE 7: Strict Mode & Cleanup

### Objective
Enable full strict mode and finalize migration.

| ID | Task | Priority | Hours | Dependencies | Acceptance Criteria |
|----|------|----------|-------|--------------|---------------------|
| T7-01 | Enable strict: true in tsconfig | Critical | 1 | All phases | Config updated |
| T7-02 | Fix all strict mode errors | Critical | 2 | T7-01 | `tsc --noEmit` passes |
| T7-03 | Set allowJs: false | Critical | 0.5 | T7-02 | No JS files in src/ |
| T7-04 | Remove old .d.ts files | Medium | 0.5 | T7-03 | Merged into .ts files |
| T7-05 | Update package.json main entry | Medium | 0.2 | T7-03 | Points to dist/index.js |
| T7-06 | Final type audit | Low | 1 | T7-05 | Zero `any` types; all exports typed |

**Phase 7 Total: 5.2 hours**

---

## Summary

| Phase | Tasks | Hours | Critical Path |
|-------|-------|-------|---------------|
| 0: Infrastructure | 5 | 3 | T0-01 → T0-02 → T0-03 |
| 1: Entry & Config | 6 | 7 | T1-01 → T1-02 → T1-03 |
| 2: Models | 6 | 8 | T2-01 → T2-02 |
| 3: Services | 7 | 12.5 | T3-01 → T3-03 |
| 4: Helper & Utils | 11 | 11 | T4-01 → T4-02 |
| 5: API Wrappers | 8 | 14 | T5-01 → T5-03 |
| 6: Routes/Controllers | 10 | 14.1 | T6-01 → T6-02 |
| 7: Strict Mode | 6 | 5.2 | T7-01 → T7-02 |
| **TOTAL** | **59** | **~75h** | |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking changes during migration | Hybrid mode (`allowJs: true`) allows gradual migration |
| External API type mismatches | Use `unknown` + type guards for Clubhouse responses |
| Singleton refactoring complexity | Create adapter layer for backward compatibility |
| Large API wrapper batch | Migrate in logical groups (auth, channels, users) |

---

## Milestones

- [ ] **M1: Foundation** - Server.ts and Models migrated (Phases 0-2)
- [ ] **M2: Logic Core** - Services typed, 50% coverage (Phases 3-4)
- [ ] **M3: Perimeter** - Routes/Controllers typed (Phases 5-6)
- [ ] **M4: Strict Mode** - 100% TS, `allowJs: false` (Phase 7)
