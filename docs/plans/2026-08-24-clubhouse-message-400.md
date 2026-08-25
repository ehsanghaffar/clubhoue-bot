# Clubhouse Message 400 Implementation Plan

**Goal:** Prevent malformed optional identity headers from causing rejected Clubhouse message requests, and retain safe upstream diagnostics for any remaining 4xx response.

**Architecture:** Normalize optional credential values at their persistence and adapter boundaries. Keep a bounded, allowlisted error detail from Clubhouse JSON responses in the typed platform error; never log arbitrary HTML or request credentials.

**Tech Stack:** TypeScript, Vitest, Clubhouse platform adapter.

---

### Task 1: Normalize optional credential values

**Files:**
- Modify: `src/core/credentials/credential.service.ts`
- Modify: `src/platforms/clubhouse/adapter.ts`
- Modify: `src/platforms/clubhouse/agent.ts`
- Test: `tests/credential.service.test.ts`, `tests/clubhouse-adapter.test.ts`

Normalize whitespace-only device IDs and external account fields to `undefined`; make the transport use Clubhouse's `(null)` user-id sentinel rather than emitting an empty header.

### Task 2: Make platform 4xx errors diagnosable

**Files:**
- Modify: `src/platforms/clubhouse/http.ts`
- Modify: `src/platforms/clubhouse/errors.ts`
- Modify: `src/platforms/clubhouse/adapter.ts`
- Test: `tests/clubhouse-http.test.ts`

Capture only allowlisted text fields from JSON error responses, limit their length, and preserve them through the adapter error. Ignore arbitrary non-JSON upstream bodies.

### Task 3: Verify the affected paths

Run: `pnpm exec vitest run tests/clubhouse-adapter.test.ts tests/credential.service.test.ts tests/clubhouse-http.test.ts`

Run: `pnpm typecheck && pnpm lint && pnpm build`
