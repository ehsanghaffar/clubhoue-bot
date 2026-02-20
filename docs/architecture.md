# ARCHITECTURE.md

# System Architecture & Dependency Rules

This document defines architectural boundaries and module interaction policies.

---

# 1. Layered Architecture

Layer hierarchy:

Routes → Controllers → Services → Models → Database

Rules:

- Routes contain only route definitions.
- Controllers orchestrate.
- Services contain business logic.
- Models define persistence schema only.

No upward imports allowed.

---

# 2. Module Structure (Target)

```
src/
  modules/
    users/
      user.model.ts
      user.service.ts
      user.controller.ts
      user.types.ts
    clubhouse/
    chatbot/
  shared/
    config/
    utils/
    types/
  server.ts
```

Modules must be isolated.

---

# 3. Dependency Rules

Forbidden:

- Cross-module deep imports
- Accessing private files of another module

Allowed:

- Import only from module public index

Example:

Good:
```
import { UserService } from "@modules/users";
```

Bad:
```
import { something } from "@modules/users/internal/file";
```

---

# 4. Shared Layer

Shared must contain:

- Config
- Error classes
- Logging
- Utilities
- Base types

Shared must NOT contain business logic.

---

# 5. Environment & Config

All environment access must go through:

```
src/shared/config/env.ts
```

No direct process.env access elsewhere.

---

# 6. Error Flow

All errors propagate upward to centralized middleware.

Services throw.
Controllers catch and forward.
Middleware formats response.

---

# 7. Future Scalability

Architecture must support:

- Testing isolation
- Dependency injection
- Feature-based modularization
- Horizontal scaling

Design decisions must favor long-term maintainability.

