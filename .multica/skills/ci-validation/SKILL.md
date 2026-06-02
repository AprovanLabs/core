---
name: ci-validation
description: Proof-of-work validation protocol for the AprovanLabs monorepo. Mandatory gates that agents must pass before transitioning an issue to in_review. Use before opening a PR.
triggers:
  - CI
  - validation
  - proof of work
  - before PR
  - gates
  - tests passing
---

# CI Validation Skill

This skill defines the mandatory validation gates that must pass before any agent transitions an issue to `in_review`. These are non-negotiable proof-of-work requirements.

## When to Use

Run this checklist before:
- Opening a PR
- Transitioning an issue to `in_review`
- Requesting a review re-run after addressing feedback

## Core Monorepo Gates

Run these from the repo root or in the affected workspace. All must pass:

### 1. Unit & Integration Tests

```bash
pnpm test
```

Or, for faster targeted runs in the affected package:
```bash
pnpm --filter <package-name> test
```

**Pass criterion**: All tests green, zero failures.

**If tests fail**: Fix the failures before proceeding. Do not open a PR with known test failures. If a test is failing due to an unrelated pre-existing issue, document this explicitly in the PR description.

### 2. Lint

```bash
pnpm lint
```

Or per-package:
```bash
pnpm --filter <package-name> lint
```

**Pass criterion**: Zero lint errors. Warnings are acceptable but should be minimized.

**If lint fails**: Fix all errors. Do not use `// eslint-disable` unless there is a documented reason.

### 3. Type Checking

```bash
pnpm typecheck
```

Or per-package:
```bash
pnpm --filter <package-name> typecheck
```

**Pass criterion**: Zero type errors.

**If typecheck fails**: Fix all type errors. Do not use `@ts-ignore` or `@ts-expect-error` without a comment explaining why.

### 4. Build (when applicable)

For apps or packages that have a build step:
```bash
pnpm build
```

Or per-package:
```bash
pnpm --filter <package-name> build
```

**Pass criterion**: Build succeeds with no errors.

## GitHub Actions CI

After pushing to a branch, confirm GitHub Actions is green:

```bash
# Check CI status on the PR
gh pr checks <pr-number>

# Or watch until complete
gh pr checks <pr-number> --watch
```

**Pass criterion**: All required status checks pass. Optional checks that fail should be noted in the PR description.

If CI fails on GitHub but passes locally:
1. Check if there are environment differences (Node.js version, env vars, OS)
2. Read the CI log: `gh run view --log-failed`
3. Fix the issue, push, and wait for CI to re-run

## Per-Repo Validation Reference

### AprovanLabs/core

| Check | Command | Notes |
|---|---|---|
| Tests | `pnpm test` | Vitest across all packages |
| Lint | `pnpm lint` | ESLint with TypeScript rules |
| Types | `pnpm typecheck` | TypeScript strict mode |
| Build | `pnpm build` | All packages |

### AprovanLabs/patchwork

| Check | Command | Notes |
|---|---|---|
| Tests | `pnpm test` | Vitest |
| Lint | `pnpm lint` | ESLint |
| Types | `pnpm typecheck` | TypeScript |

*(Update this table as CI configurations evolve)*

## PR Readiness Checklist

Complete this before opening a PR or requesting re-review:

- [ ] `pnpm test` passes (zero failures)
- [ ] `pnpm lint` passes (zero errors)
- [ ] `pnpm typecheck` passes (zero errors)
- [ ] `pnpm build` passes (if applicable)
- [ ] GitHub Actions CI is green on the pushed commit
- [ ] PR description includes a test plan
- [ ] All acceptance criteria from the issue are met
- [ ] No secrets or tokens committed
- [ ] Workpad updated with PR URL
- [ ] No `.skip` calls left on new tests

## Handling Pre-existing Failures

If you discover that a test or lint check was already failing before your change:
1. Do not fix it as part of this PR (scope creep)
2. Document it in the PR description: "Pre-existing test failure in `<test name>` — unrelated to this change, tracked in <new issue>"
3. Create a follow-up issue for the pre-existing failure
4. Proceed with your PR, making clear the failure is pre-existing

Never silently ignore or `skip` a test that was previously passing.
