---
name: ci-validation
description: Proof-of-work validation protocol for the AprovanLabs repos. Mandatory gates that agents must pass before transitioning an issue to in_review. Use before opening a PR and before merging. Called during Phase 2 of symphony-execution.
triggers:
  - CI
  - validation
  - proof of work
  - before PR
  - gates
  - tests passing
  - pre-merge
  - acceptance criteria
---

# CI Validation Skill

This skill defines the mandatory validation gates that must pass before any agent transitions an issue to `in_review` or merges a PR. These are non-negotiable proof-of-work requirements.

**Integration:** This skill is called during **Phase 2 (Execute)** of the `symphony-execution` skill — specifically at the Final Validation step (2.5) before opening the PR, and again at the pre-merge gate before requesting merge.

## When to Use

Run the relevant phase checklist before:
- Opening or updating a PR (→ Phase 1: Pre-PR gate)
- After CI runs on the pushed branch (→ Phase 2: CI monitoring)
- Before requesting merge after review approval (→ Phase 3: Pre-merge gate)

---

## Per-Repo Validation Commands

| Repo | Tests | Lint | Type Check | Build |
|---|---|---|---|---|
| `registry` | `pnpm test` | `pnpm lint` | `pnpm typecheck` | `pnpm build` |
| `core` | `pnpm test` | `pnpm lint` | `pnpm typecheck` | `pnpm build` |
| `aprovan.com` | `pnpm test` | `pnpm lint` | — | `pnpm build` |

For targeted runs in an affected package:
```bash
pnpm --filter <package-name> test
pnpm --filter <package-name> lint
pnpm --filter <package-name> typecheck
pnpm --filter <package-name> build
```

---

## Phase 1 — Pre-PR Gate

Run all applicable checks before creating or updating a PR. **All must pass.**

### 1.1 Tests

```bash
pnpm test
```

**Pass criterion**: All tests green, zero failures.

**If tests fail**: Fix the failures before proceeding. Do not open a PR with known test failures. If a test is failing due to an unrelated pre-existing issue, document it explicitly in the PR description and create a follow-up issue.

### 1.2 Lint

```bash
pnpm lint
```

**Pass criterion**: Zero lint errors. Warnings are acceptable but should be minimized.

**If lint fails**: Fix all errors. Do not use `// eslint-disable` unless there is a documented reason in the same line comment.

### 1.3 Type Check

```bash
pnpm typecheck
```

*(Skip for `aprovan.com` — no TypeScript strict type check configured.)*

**Pass criterion**: Zero type errors.

**If typecheck fails**: Fix all type errors. Do not use `@ts-ignore` or `@ts-expect-error` without a comment explaining why.

### 1.4 Build

```bash
pnpm build
```

**Pass criterion**: Build succeeds with no errors.

### 1.5 Issue-Specific Acceptance Criteria Validation

If the issue description contains testable acceptance criteria:

1. Identify each criterion that can be covered by an automated test
2. Confirm tests exist for each; write missing tests before opening the PR
3. Run those specific tests and confirm they pass:
   ```bash
   pnpm --filter <package-name> test -- --grep "<criterion description>"
   ```
4. Update the workpad with a mapping: which acceptance criterion is validated by which test file/case

**Do not open a PR if testable acceptance criteria lack test coverage.**

---

## Phase 2 — PR CI Monitoring

After pushing and opening the PR, confirm GitHub Actions is green.

### 2.1 Check CI Status

```bash
# Check immediately after push
gh pr checks <pr-number>

# Poll until complete
gh pr checks <pr-number> --watch
```

**Pass criterion**: All required status checks pass. Optional checks that fail should be noted in the PR description.

### 2.2 Diagnose and Fix CI Failures

If CI fails on GitHub but passes locally:

1. Check for environment differences (Node.js version, env vars, OS)
2. Read the failure log:
   ```bash
   gh run view --log-failed
   ```
3. Fix the issue, push, and wait for CI to re-run:
   ```bash
   git add <specific files>
   git commit -m "fix: <description of CI fix>"
   git push
   gh pr checks <pr-number> --watch
   ```
4. Repeat until all checks pass

---

## Phase 3 — Pre-Merge Gate

Before requesting merge (after review approval), confirm the branch is merge-ready.

### 3.1 All CI Checks Green

```bash
gh pr checks <pr-number>
```

All required checks must be passing on the most recent commit.

### 3.2 No Unresolved Review Comments

```bash
gh pr view <pr-number> --json reviewRequests,reviews
```

All review threads must be resolved. If a reviewer raised a concern, address it or explicitly mark it as resolved with a reply explaining the decision.

### 3.3 Branch Up to Date with Main

```bash
git fetch origin
git rebase origin/main
```

If the rebase introduces new changes, push and wait for CI to re-run before merging.

### 3.4 Re-Run CI After Rebase (if needed)

```bash
git push --force-with-lease
gh pr checks <pr-number> --watch
```

All checks must be green on the rebased commit before merging.

---

## PR Readiness Checklist

Complete this before opening a PR or requesting re-review:

- [ ] `pnpm test` passes (zero failures)
- [ ] `pnpm lint` passes (zero errors)
- [ ] `pnpm typecheck` passes (zero errors, if applicable for this repo)
- [ ] `pnpm build` passes (if applicable)
- [ ] All testable acceptance criteria have test coverage
- [ ] GitHub Actions CI is green on the pushed commit
- [ ] PR description includes a test plan
- [ ] All acceptance criteria from the issue are met
- [ ] No secrets or tokens committed
- [ ] Workpad updated with PR URL and acceptance criteria → test mapping
- [ ] No `.skip` calls left on new tests

---

## Handling Pre-existing Failures

If you discover that a test or lint check was already failing before your change:

1. Do not fix it as part of this PR (scope creep)
2. Document it in the PR description: "Pre-existing test failure in `<test name>` — unrelated to this change, tracked in <new issue>"
3. Create a follow-up issue for the pre-existing failure
4. Proceed with your PR, making clear the failure is pre-existing

Never silently ignore or `skip` a test that was previously passing.
