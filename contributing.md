# CONTRIBUTING.md

# Clubhouse Full API Bot – Contribution & Copilot Execution Guide

This document defines the engineering standards, migration rules, branching model, CI gates, and Copilot execution constraints for refactoring and maintaining this codebase.

Primary goals:

- Full strict TypeScript migration
- Architectural stabilization
- Security hardening
- Production-grade maintainability
- Enforced quality via CI

This file is authoritative. Humans and AI agents must follow it strictly.

---

# 1. Core Engineering Principles

## 1.1 Incremental Refactoring Only

Forbidden:
- Big-bang rewrites
- Massive structural changes in one PR

Required:
- Small, verifiable commits
- One concern per PR
- Compilation success after every step

---

## 1.2 TypeScript-First Policy

- All new code must be TypeScript.
- JavaScript is legacy and must not be introduced.
- Migration must move toward zero .js files inside src.

Final required compiler state:

```
"strict": true
"noImplicitAny": true
"strictNullChecks": true
"allowJs": false
```

No explicit `any` unless documented with justification.

---

# 2. Migration Order (Mandatory)

Copilot and contributors must follow this exact sequence.

## Phase 1 – Foundation
1. Convert server.js → server.ts
2. Ensure build works
3. Keep allowJs: true temporarily

## Phase 2 – Models First

All Mongoose models must:

- Define domain interface
- Define Document interface
- Use generic Schema typing
- Export typed Model

No untyped model is allowed.

---

## Phase 3 – Services

Rules:

- Return fully typed responses
- Use axios/fetch generics
- No any
- No singleton exports
- No Express imports inside services

Services must be pure business logic.

---

## Phase 4 – Controllers

Controllers must:

- Use Express generics
- Define Body/Params/Query interfaces
- Return typed responses
- Never access untyped req.body

---

## Phase 5 – Middlewares

- Extend Express Request properly
- Store custom types in src/types/express.d.ts
- No untyped mutation of request

---

## Phase 6 – Strict Enforcement

After full migration:

```
"allowJs": false
```

The project must compile with zero errors.

---

# 3. Architecture Rules

Layer direction:

Routes → Controllers → Services → Models

Hard rules:

- Routes contain no logic
- Controllers contain no database queries
- Services do not import Express
- Models do not import services
- No circular dependencies

---

# 4. Security Standards

## 4.1 Environment Safety

- No hardcoded secrets
- All secrets from environment variables
- Environment must be validated at startup

## 4.2 Input Validation

All routes must validate input using Joi or Zod.
Controllers assume validated data.

---

# 5. Error Handling Policy

All errors must:

- Use centralized AppError class
- Include statusCode
- Include error type

No scattered res.status(500).
All errors pass through global error middleware.

---

# 6. Type Safety Standards

## 6.1 No Implicit Any

Forbidden:
```
function test(param) {}
```

Required:
```
function test(param: string): void {}
```

---

## 6.2 Typed External APIs

All external API calls must define response types.

Example:
```
axios.post<ApiResponse>(...)
```

---

## 6.3 Environment Schema Validation

Environment variables must be parsed via schema validation before app start.

---

# 7. Git & Branching Strategy

## 7.1 Branch Model

Main branches:

- main → production-ready
- develop → integration branch

Feature workflow:

- feature/<name>
- refactor/<area>
- fix/<issue>

No direct commits to main.

---

## 7.2 Commit Convention (Mandatory)

We follow Conventional Commits:

- feat:
- fix:
- refactor:
- chore:
- docs:
- test:

Example:

```
refactor(models): convert User model to strict TypeScript
```

Commits must be descriptive and scoped.

---

# 8. CI Enforcement Rules

Every PR must pass:

1. TypeScript type-check
2. Linting
3. Build
4. No new any detection

CI must fail if:

- allowJs is reintroduced
- strict mode is disabled
- any count increases

---

# 9. Copilot Execution Protocol

When performing automated refactoring:

1. Modify only one file at a time
2. Do not change runtime behavior
3. Do not rename public APIs unless instructed
4. Do not introduce architectural redesign unless task says so
5. Run type-check mentally before finalizing

Before completing task, verify:

- No implicit any
- No circular imports
- No broken build
- No security regression

Copilot must never:

- Rewrite entire folders without request
- Mix ESM and CommonJS
- Add temporary hacks without TODO note

---

# 10. Pull Request Checklist

Every PR must confirm:

- Project compiles
- No JS added
- Type safety improved or maintained
- No dead code added
- No unused imports
- No console.log left in production code

---

# 11. Forbidden Patterns

- Hardcoded secrets
- Singleton service exports
- Global mutable state
- Silent catch blocks
- Unhandled promises
- Magic numbers without constants
- Cross-layer imports

---

# 12. Definition of Done – TypeScript Migration

Migration is complete when:

- No .js files remain in src
- allowJs = false
- strict = true
- tsc runs without errors
- No undocumented any
- Clean dist build output

---

# 13. Long-Term Quality Roadmap

Planned improvements:

- Add test layer (Jest or Vitest)
- Add rate limiting
- Add structured logging
- Add health check endpoint
- Add OpenAPI documentation
- Enforce dependency boundaries
- Introduce automated dead-code detection

---

# Final Statement

This codebase is evolving from loosely-typed JavaScript into a strictly-typed, production-grade TypeScript backend.

Every change must:

- Increase type safety
- Improve structure clarity
- Reduce hidden runtime risk
- Maintain backward compatibility unless explicitly breaking

Strictness is a feature.
Discipline is mandatory.

