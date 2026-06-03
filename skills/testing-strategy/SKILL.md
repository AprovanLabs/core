---
name: testing-strategy
description: Test planning guide covering unit, integration, and e2e test strategy for the AprovanLabs monorepo. Use when deciding what tests to write or auditing test coverage.
triggers:
  - testing
  - test plan
  - test strategy
  - coverage
  - test cases
---

# Testing Strategy Skill

Use this skill when planning tests for a new feature, fixing a bug, or auditing test coverage.

## When to Use

- Before implementing a feature: decide what tests to write
- When fixing a bug: determine the regression test to add
- When asked to improve test coverage on an area of the codebase
- Before transitioning an issue to `in_review`: confirm test requirements are met

## Test Pyramid

Write tests at the appropriate level — not everything needs e2e:

```
         /\
        /e2e\         (few — slow, brittle, high value for critical paths)
       /------\
      /integra-\      (moderate — test real boundaries: DB, HTTP, queues)
     /  tion    \
    /------------\
   /    unit      \   (many — fast, isolated, test business logic)
  /______________\
```

### Unit Tests

**When:** Pure functions, business logic, data transformations, utility modules.

**Tooling:** Vitest (all workspaces in core monorepo).

**Standards:**
- Test behavior, not implementation
- One assertion per test (or logically grouped assertions for one scenario)
- Descriptive test names: `it('returns null when input is empty', ...)`
- Mock only at process boundaries (network, file system, time)

**Pattern:**
```typescript
describe('<unit under test>', () => {
  it('<scenario>', () => {
    // Arrange
    // Act
    // Assert
  })
})
```

### Integration Tests

**When:** Code that touches a database, makes HTTP calls, reads from queues, or crosses service boundaries.

**Tooling:** Vitest with test database (Docker Compose in CI); MSW for HTTP mocking.

**Standards:**
- Use a real (ephemeral) database, not in-memory stubs, for DB tests
- Reset state between tests (transactions rolled back, or explicit truncate)
- Test the full request-response cycle for API routes
- Assert on observable outcomes (DB state, response body), not internals

### E2E Tests

**When:** Critical user journeys that must be validated against the full stack.

**Tooling:** Playwright (configured in apps/<app>/playwright.config.ts).

**Standards:**
- Cover the happy path and the most important error paths only
- Use page objects or fixtures to avoid duplicating selectors
- Run in CI on every PR; failures block merge

## Deciding What to Test

For each change, ask:

1. **What behavior am I adding or modifying?** → Write a test that directly validates that behavior.
2. **What could break?** → Write regression tests for the failure modes.
3. **Is there existing test coverage for the code I'm touching?** → Don't reduce it.
4. **Is there a path that's hard to test at unit level?** → Push it to integration level.

## Test Coverage Requirements

| Layer | Minimum Coverage Target |
|---|---|
| Packages (business logic) | 80% line coverage |
| API routes | All success + primary error paths |
| UI components | Critical user interactions |
| E2E | Top 3-5 user journeys |

## Before Transitioning to `in_review`

- [ ] Tests written for new behavior
- [ ] Tests written for fixed bug (regression)
- [ ] All tests pass locally (`pnpm test`)
- [ ] CI test run green (check GitHub Actions)
- [ ] No test files committed with `.skip` on new tests
