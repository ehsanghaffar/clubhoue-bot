# Technical Migration Plan: Clubhouse Full API Bot (JS to TS v5.x)

## PART 1: STRATEGIC ROADMAP

### 1. Project Audit & Risk Assessment
The current system operates at a **Health Score of 42/100**, characterized as a high-liability technical debt trap.
*   **Critical Modules:** The project follows a layered architecture (Routes → Controllers → Services → Models).
*   **High-Risk "Gravity" Files:**
    *   `src/helper/agent.js`: Extreme cyclomatic complexity (12) handling both header and query logic.
    *   `server.js`: Cluttered bootstrap logic (complexity 11) prone to "silent failures".
    *   `src/routes/chatbot.routes.js`: Significant architecture violation with business logic (OpenAI calls) embedded in the transport layer.
*   **Shared Utilities:** `src/middlewares/auth.js` (complex error handling) and `src/services/clubApiService.js` (singleton pattern blocking horizontal scaling).

### 2. Progressive Environment Setup
We will adopt a staged `tsconfig.json` strategy to manage the 60-hour migration over 8 weeks.
*   **Phase 1: Migration Mode (Lax)**
    *   **Goal:** Enable a hybrid environment to allow incremental progress.
    *   **Settings:** `allowJs: true`, `checkJs: true`, and `target: ES2022`.
    *   **Dependency Upgrades:** Concurrently upgrade to **TypeScript v5.x**, **Mongoose v8+**, and **OpenAI v4.x** to leverage native type definitions.
*   **Phase 2: Production Mode (Strict)**
    *   **Goal:** Enforce the "Type Safety Shield".
    *   **Settings:** `allowJs: false`, `checkJs: false`, and `strict: true`.
    *   **Outcome:** 100% TypeScript coverage.

### 3. Incremental Migration Strategy
The migration follows a 7-phase implementation plan.
*   **Coexistence:** Existing `.js` files will coexist with `.ts` files using JSDoc for basic type hinting where formal types are pending.
*   **Migration Order:**
    1.  **Top-Down (Entry Point):** `server.js` → `server.ts` (Phase 1) to ensure the bootstrap process is type-aware.
    2.  **Bottom-Up (Data Layer):** **Models** (Phase 2) to establish the "source of truth" for data integrity.
    3.  **Logic Core:** **Services** (Phase 3), the most complex stage involving external API typing.
    4.  **Application Layer:** Progress through **Controllers** (Phase 4) and **Routes** (Phase 5).
    5.  **Finalization:** Utils and Middlewares (Phase 6) with strict null checks.

### 4. Advanced Typing Strategy
*   **Third-Party Dependencies:** Prioritize native types (Mongoose v8, OpenAI v4) and use `@types` via DefinitelyTyped for legacy packages like `jsonwebtoken` (upgrading to v9.x).
*   **Strict Typing Standards:**
    *   **Eliminate `any`:** Strictly prohibit `any` in new files.
    *   **External Data:** Use **`unknown`** for Clubhouse API responses, validated via **Type Guards** or schemas before consumption.
    *   **Interfaces:** Transition to interface-driven handlers for all request and response objects.

### 5. Infrastructure & CI/CD
*   **Quality Gates:** Integrate **ESLint** (with TS-specific rules) and **Prettier** into the pre-commit hooks to enforce camelCase naming and consistent style.
*   **CI Pipeline:** Implement automated type-checking using `tsc --noEmit` as a mandatory gate. Build failures must occur if compilation fails.
*   **Testing Synergy:** Use **MSW** or **Nock** to mock external APIs, ensuring tests (target 85% coverage) remain stable during refactoring.

---

## PART 2: ACTIONABLE TASK INVENTORY (The Backlog)

| Task ID | Task Name | Priority | Complexity | Dependencies | Acceptance Criteria (DoD) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TASK-01** | Configure TS Infrastructure | **Critical** | Low | None | `tsconfig.json` (Phase 1) set up; ESLint/Prettier TS rules active. |
| **TASK-02** | Entry Point Migration | **Critical** | Medium | TASK-01 | `server.ts` compiles; bootstrap logic extracted. |
| **TASK-03** | Type-Safe Data Models | **High** | Medium | TASK-02 | Mongoose v8 schemas implemented; data integrity enforced. |
| **TASK-04** | Services Layer Migration | **High** | **High** | TASK-03 | Clubhouse/OpenAI calls fully typed; no `any` in services. |
| **TASK-05** | Controller/Route Typing | **Medium** | Medium | TASK-04 | Interface-driven request/response handling implemented. |
| **TASK-06** | Strict Null Check Cleanup | **Medium** | Low | TASK-05 | Phase 6 complete; elimination of null-pointer risks. |
| **TASK-07** | Strict Mode Activation | **Low** | Low | TASK-06 | `allowJs: false`; 100% TS coverage achieved; build passes. |

---

## REFACTORING PATTERNS

### 1. Transport Layer Violation (Business Logic in Routes)
*   **Issue:** Business logic like OpenAI calls is embedded directly in route handlers.
*   **Before (JS):**
    ```javascript
    // src/routes/chatbot.routes.js
    router.post('/start', async (req, res) => {
      const response = await openAI.createCompletion({...}); // Logic in route
      res.json(response);
    });
    ```
*   **After (TS):**
    ```typescript
    // Logic extracted to ChatbotService
    class ChatbotService {
      async startChat(params: ChatParams): Promise<ChatResponse> {
        return await this.openAI.generate(params);
      }
    }
    ```

### 2. Singleton to Dependency Injection
*   **Issue:** Singleton services prevent effective testing and horizontal scaling.
*   **Before (JS):**
    ```javascript
    // src/services/clubApiService.js
    const clubApiService = new ClubApiService(); // Hardcoded singleton
    module.exports = clubApiService;
    ```
*   **After (TS):**
    ```typescript
    // Refactored to Factory or DI pattern
    export class ClubApiService {
      constructor(private profile: UserProfile) {} 
    }
    // usage: const service = new ClubApiService(loadedProfile);
    ```

### 3. Synchronous Blocking Operations
*   **Issue:** `readFileSync` blocks the event loop, capping Max RPS at ~50.
*   **Before (JS):**
    ```javascript
    // src/routes/profiles.routes.js
    const data = fs.readFileSync('profile.json'); // Blocking call
    ```
*   **After (TS):**
    ```typescript
    // Replaced with non-blocking fs.promises
    import { readFile } from 'fs/promises';
    const data = await readFile('profile.json', 'utf-8');
    ```

---

## MILESTONES
- [ ] **M1: Foundation (Month 1):** Server and Models migrated; Mongoose v8 schemas active.
- [ ] **M2: Logic Core (Month 3):** Services typed; 50% TS coverage; OpenAI v4 integrated.
- [ ] **M3: Perimeter (Month 5):** Controllers and Routes fully typed; interface-driven handlers.
- [ ] **M4: Strict Mode (Month 6):** 100% TS coverage; `allowJs` removed; strict null checks enabled.