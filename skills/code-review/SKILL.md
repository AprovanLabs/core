---
name: code-review
description: Structured code review process covering correctness, security, performance, maintainability, and style. Use when reviewing a PR or evaluating code quality.
triggers:
  - review
  - code review
  - PR review
  - pull request review
---

# Code Review Skill

Use this skill when you are reviewing a PR or assessing code quality on an existing codebase.

## When to Use

- You are assigned to review a PR
- An issue asks you to audit a piece of code
- You are the Architect reviewing for structural soundness
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

## Review Output Format

Post your review as a comment on the issue or PR. Use this structure:

```markdown
## Code Review

**Verdict:** Approve | Request Changes | Comment

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
