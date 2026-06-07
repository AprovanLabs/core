---
name: code-review
description: Structured code review process covering correctness, security, performance, maintainability, and style. Use when reviewing a PR or evaluating code quality. Includes auto-approval criteria for the PR Reviewer agent.
triggers:
  - review
  - code review
  - PR review
  - pull request review
  - auto-approve
---

# Code Review Skill

Use this skill when you are reviewing a PR or assessing code quality on an existing codebase.

## When to Use

- You are assigned to review a PR
- An issue asks you to audit a piece of code
- You are the Architect reviewing for structural soundness
- You are the PR Reviewer evaluating a PR for auto-approval
- You are checking your own implementation before transitioning to `in_review`

## Review Dimensions

Evaluate code across these dimensions in order of importance:

### 1. Correctness

- Does the code do what the issue/PR description claims?
- Are edge cases handled (null/undefined, empty arrays, zero values, concurrent access)?
- Are error paths handled and surfaced correctly?
- Are async operations awaited properly?
- Do tests exist for the new behavior and do they pass?

### 2. Security

- Is all external input validated at system boundaries?
- Are there any injection risks (SQL, command, HTML)?
- Are secrets/tokens accessed via environment variables, never hardcoded?
- Are authorization checks present for sensitive operations?
- Is data sanitized before being returned to clients?

### 3. Performance

- Are there N+1 query patterns in loops?
- Are expensive operations (network, DB, heavy compute) appropriately cached or batched?
- Are there obvious memory leaks (unclosed streams, unremoved event listeners)?
- Is pagination used for potentially large result sets?

### 4. Design & Maintainability

- Is the change consistent with existing patterns in the codebase?
- Is the scope of the change appropriate (not over-engineered, not under-abstracted)?
- Are functions and variables named clearly?
- Is there unnecessary code duplication?
- Is the change testable without complex mocking?

### 5. Style & Conventions

- Does it pass lint (`pnpm lint`) and type checks (`pnpm typecheck`)?
- Is formatting consistent with the surrounding code?
- Are comments present only where logic is non-obvious?

## Auto-Approval Criteria

When acting as the PR Reviewer, evaluate the PR against these auto-approval criteria. **All criteria must hold** for auto-approval. If any criterion fails, escalate to human review.

### Checklist

- [ ] **CI is green** — all status checks on the PR show `success`
- [ ] **Diff is under ~200 lines changed** — total additions + deletions across all files. Use `git diff --stat origin/main...HEAD` to count. Minor overages (210 lines in a 200-line refactor) are acceptable; large overages are not.
- [ ] **No new dependencies added** — check `package.json`, `package-lock.json`/`pnpm-lock.yaml`, `Cargo.toml`, `go.mod`, or equivalent for the repo. Dev dependencies (test utilities, lint plugins) are acceptable if they don't introduce runtime risk.
- [ ] **Changes limited to existing files** — no new public API surface (no new exported functions, types, endpoints, or public classes). Internal helper functions and private methods within existing files are acceptable. New test files are acceptable.
- [ ] **No security-sensitive files touched** — none of the changed files match security-sensitive patterns:
  - `**/auth*`, `**/crypto*`, `**/secret*`, `**/credential*`
  - `**/.env*`, `**/permission*`, `**/rbac*`, `**/acl*`
  - `**/middleware/auth*`
  - Any file containing JWT, OAuth, session, or token logic
- [ ] **PR description present** — the PR body is not empty and explains what changed and why
- [ ] **Test plan present** — the PR body includes a "Test Plan" or "Test plan" section with at least one verification step

### Decision Logic

```
if ALL criteria hold:
  → APPROVE on GitHub, squash-merge the PR, transition issue to done
else:
  → Escalate: post specific concerns on the Multica issue, leave in in_review
```

Never override a failing criterion. If in doubt, escalate.

## Escalation Path

When auto-approval criteria are NOT met, the PR Reviewer must:

1. **Post a comment on the Multica issue** with specific concerns using this format:

```markdown
## PR Review — Escalated to Human

**Verdict:** Escalated (auto-approval criteria not met)

**Failing criteria:**
- <criterion that failed>: <specific evidence>
- <criterion that failed>: <specific evidence>

**Passing criteria:**
- <criterion>: <brief confirmation>

### Recommended human review focus
- <what the human reviewer should pay attention to>
```

2. **Leave the issue in `in_review`** — do NOT block the workflow, just flag and move on.
3. **Do NOT merge the PR** — even if the concern seems minor.
4. **Do NOT attempt to fix the PR yourself** — the implementing agent or a human should address the feedback.

### Escalation Examples

- Diff is 450 lines → "Escalated: diff is 450 lines (limit ~200). This is a larger change that warrants human review for structural soundness."
- New dependency added → "Escalated: `package.json` adds `lodash@4.17.21`. New runtime dependencies require human approval to assess supply-chain risk."
- Auth file touched → "Escalated: `packages/auth/src/session.ts` was modified. Security-sensitive files always require human review."

## Review Output Format

Post your review as a comment on the issue or PR. Use this structure:

```markdown
## Code Review

**Verdict:** Approve | Request Changes | Escalated to Human

### Critical (must fix before merge)
- <issue with file:line reference if possible>

### Major (should fix)
- <issue>

### Minor (nit, can fix or ignore)
- <nit>

### Positive Notes
- <things done well — always include at least one>
```

## Self-Review Checklist

When reviewing your own implementation before opening a PR:

- [ ] I read the full diff and it matches the issue acceptance criteria
- [ ] I ran the test suite and all tests pass
- [ ] I ran lint and type checks with no errors
- [ ] I checked for hardcoded values that should be config
- [ ] I verified error paths are handled
- [ ] I confirmed no secrets are committed
- [ ] PR description explains what changed and why
