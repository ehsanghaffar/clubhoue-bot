# CI.yml – GitHub Actions

This is a recommended CI configuration enforcing strict TypeScript and quality gates.

```yaml
name: CI

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [develop]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 20

      - name: Install Dependencies
        run: npm ci

      - name: Type Check
        run: npx tsc --noEmit

      - name: Lint
        run: npm run lint

      - name: Build
        run: npm run build
```

---

# CI Enforcement Rules

CI must fail if:

- TypeScript compilation fails
- Lint fails
- Build fails
- strict mode disabled
- allowJs reintroduced

---

# Optional Advanced Gates (Future)

- Check for explicit any count increase
- Circular dependency detection
- Dead code detection
- Test coverage threshold enforcement

Strict pipeline ensures long-term code health.

