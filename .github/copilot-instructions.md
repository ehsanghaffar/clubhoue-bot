# copilot-instructions.md

# AI Execution Rules – Strict Mode

This file defines machine-enforceable behavioral constraints for AI coding agents working on this repository.

---

# 1. Execution Constraints

Copilot MUST:

1. Modify only one file per refactor step unless explicitly instructed.
2. Preserve runtime behavior unless task explicitly allows breaking changes.
3. Never introduce `any`.
4. Never disable strict mode.
5. Never introduce `.js` files inside `src/`.
6. Avoid architectural redesign unless task explicitly states "architecture refactor".

---

# 2. Migration Guardrails

When converting JS → TS:

- First add types.
- Then remove implicit any.
- Then tighten null safety.
- Then enable strict checks.

Never convert and refactor logic simultaneously.

---

# 3. Structural Boundaries

Forbidden imports:

- services importing controllers
- models importing services
- services importing Express

Allowed flow:

Routes → Controllers → Services → Models

---

# 4. Type Safety Enforcement

Before finishing a task, Copilot must ensure:

- All function parameters typed
- All return types declared
- No implicit any
- External API responses typed
- Environment variables validated

---

# 5. Refactor Safety Checklist

Copilot must verify:

- No circular dependencies
- No dead imports
- No console.log in production code
- No silent catch blocks

---

# 6. Forbidden Behaviors

Copilot must NEVER:

- Rewrite entire folders without request
- Rename public APIs without instruction
- Introduce temporary hacks without TODO
- Add comments like "fix later"

---

# 7. Completion Criteria

A task is complete only when:

- TypeScript compiles
- No new warnings
- Structure remains clean
- Layer boundaries respected

Strict enforcement required.

