---
title: Establish test infrastructure as the foundation for quality improvement
severity: critical
affected_repos:
  - core
  - registry
  - patchwork
  - zolvery
  - data-science
affected_files:
  - (core: 8 untested modules out of 99 production files)
  - (registry: 106 untested modules out of 1,858 production files)
  - (patchwork: near-0% across 7 of 8 packages)
  - (zolvery: 78 untested modules, 1.1% test health)
  - (data-science: 5 untested modules, 36% test health)
created: 2026-06-07
updated: 2026-06-07
---

# Test Infrastructure Before Test Coverage

## Problem

Near-zero test health is the single largest mechanical score drag across every AprovanLabs repo. The first Code Quality Sentinel scan (APR-75) found:

| Repo | Test Health | Untested Modules | Production Files |
|------|-------------|-------------------|------------------|
| core | 36.3% | 8 | 99 |
| registry | 29.7% | 106 | 1,858 |
| patchwork | ~0% (7 of 8 packages) | — | — |
| zolvery | 1.1% | 78 | — |
| data-science | 36.0% | 5 | 17 |

The root cause is not missing test *files* — it's missing test *infrastructure*. Without a shared test runner, shared fixtures, and a testing convention that new code follows, adding tests is an ad-hoc per-package effort that scales poorly.

```ts
// ❌ No shared test infra — every package reinvents setup
// packages/foo/vitest.config.ts (custom, duplicated)
// packages/bar/vitest.config.ts (custom, different settings)
// packages/baz/ — no test runner at all
```

## Recommended Fix

### 1. Use the shared vitest config package

`@aprovan/vitest-config` is already published in the core monorepo. All packages should extend it:

```ts
// ✅ packages/foo/vitest.config.ts — extends shared config
import { defineConfig } from "@aprovan/vitest-config";

export default defineConfig({
  // Package-specific overrides only
  include: ["src/**/*.test.ts"],
});
```

### 2. Add a test script to every package

Every `package.json` in the monorepo must have a `test` script:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

At the workspace root, `pnpm -r test` runs all tests.

### 3. Start with high-impact modules

Don't try to reach 80% coverage in one pass. Prioritize:

1. **Type definition files** (`types.ts`, `*.types.ts`) — these define contracts that everything depends on; wrong types cascade silently
2. **Utility functions** (pure functions with no side effects — easiest to test, highest ROI)
3. **Core hooks and services** — business logic that breaks user flows when incorrect
4. **Monster functions** (>150 LOC) — decompose first, then test the smaller pieces

### 4. Set a minimum test health target

Enforce a floor via the scanner. The recommended progression:

- **Phase 1:** Get every package to 10% test health (add the runner, write smoke tests)
- **Phase 2:** Get critical packages (devtools, shared configs) to 50%+
- **Phase 3:** Target 80%+ for packages with external consumers

## Impact

- **Score improvement:** Test health is the single largest mechanical score drag. Raising registry from 29.7% to 50% would improve its objective score by ~7 points.
- **Refactoring safety:** Without tests, any refactor is a leap of faith. Monster functions (found in 4+ packages) cannot be safely decomposed without test coverage.
- **Regression prevention:** The Sentinel found multiple security and smell issues that would have been caught by even basic tests (e.g., unguarded JSON.parse throwing on malformed input).

## Scanner Enforcement

**Scanner enforcement:** `test-coverage` detector in desloppify. Reports `test_health` as a percentage and flags untested production modules. Currently advisory (T4 tier); promote to T2 once shared vitest config is adopted across all packages.

Candidate scanner rule: `test-script-required` — flags any `package.json` in the monorepo that lacks a `test` script.

## References

- [APR-197](mention://issue/8493a24e-f6ee-43f3-a500-8def78ee5c7e) — Improve test coverage in core repo
- [APR-128](mention://issue/6357cb74-dc85-4110-ac45-8a8751ae5acb) — Test gap + monster function in patchwork/compiler
- [APR-130](mention://issue/f22ceff5-5f35-4463-997c-fcb6974d24fe) — Critical test gap in patchwork/bobbin
- [APR-158](mention://issue/e36960fe-e464-4a35-ab43-bc66029ede09) — 78 test gaps in zolvery
- [APR-135](mention://issue/efc388ff-81b1-499d-877b-0750f4826fb8) — Code quality + test issues in registry
