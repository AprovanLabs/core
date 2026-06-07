---
name: symphony-execution
description: Phases 1-2 of the Symphony workflow — plan-and-execute loop. Takes an issue from todo through implementation to a submitted PR. Use after routing determines Phase 1 or Phase 2.
triggers:
  - execute
  - implement
  - coding
  - plan and execute
  - Phase 1
  - Phase 2
---

# Symphony Execution Skill (Phases 1-2)

This skill guides the core implementation loop: build a plan, execute it, validate with CI, and open a PR.

## Phase 1 — Plan

### 1.0 Checkout Repository

If the code is not yet checked out, fetch it first:

```bash
multica repo checkout <url>   # URL from project resources (.multica/project/resources.json)
```

Then create a feature branch:

```bash
git checkout -b <issue-identifier>/<short-slug>
# e.g. git checkout -b APR-47/symphony-execution-skill
```

If the branch already exists from a prior run, switch to it and rebase:

```bash
git checkout <branch>
git fetch origin
git rebase origin/main
```

### 1.1 Create the Workpad

Post a workpad comment immediately. Don't wait until the plan is fully formed:

```bash
multica issue comment add <issue-id> --content "## Agent Workpad

**Phase:** Plan
**Status:** Building plan — reading issue and codebase
**PR:** (not yet opened)

### Plan

- [ ] Read and understand issue requirements
- [ ] Explore relevant code
- [ ] Build implementation plan
"
```

### 1.2 Read and Understand the Issue

- Read the full description including acceptance criteria
- Read all prior comments (context may be in comments, not the description)
- Identify: what needs to be built, what success looks like, what the constraints are

### 1.3 Reconcile Prior Work

Before writing any new code:
1. Check for existing branches: `git branch -a | grep <issue-identifier-slug>`
2. Check for any stale PRs: use the `github` MCP `list_pull_requests` tool (`owner: AprovanLabs`, `repo: <repo>`, `state: all`) or `search_issues` with query `<identifier> is:pr`. Also check the `pr_url` metadata key.
3. If prior work exists: check it out, evaluate what's done vs. what's needed

### 1.4 Explore the Codebase

- Find the files you'll need to modify: read them before touching them
- Understand the patterns used by adjacent code
- Check existing tests to understand expected behavior
- Identify any shared utilities or types you should reuse

### 1.5 Build the Plan

Update the workpad with a hierarchical implementation plan:

```markdown
### Plan

- [ ] Set up branch and explore relevant files
- [ ] Implement <component A>
  - [ ] Sub-task 1
  - [ ] Sub-task 2
- [ ] Write tests for <component A>
- [ ] Implement <component B>
- [ ] Write tests for <component B>
- [ ] Run full CI validation suite
- [ ] Open PR
```

For **bug fixes**, add a reproduction step before the fix:
- [ ] Reproduce: write a failing test that captures the bug
- [ ] Fix: implement the minimal change that makes the test pass

### 1.6 Sync Branch

```bash
git fetch origin
git rebase origin/main
```

If on the default agent branch and rebase would be complex, create a feature branch:
```bash
git checkout -b feat/<issue-slug>
```

**Exit Phase 1**: Workpad updated with complete plan → proceed to Phase 2.

---

## Phase 2 — Execute

### 2.1 Resume from Workpad

On re-entry to Phase 2:
1. Read the workpad to find the next unchecked item
2. Don't re-do completed items (even if tempting to "start clean")
3. If unsure what's done, check `git log` for recent commits

### 2.2 Implement Incrementally

Work through TODO items **one at a time**:

```
for each unchecked TODO item:
  1. Implement the item (smallest change that satisfies it)
  2. Verify it works (targeted test or manual check)
  3. Run tests for the affected package: pnpm test --filter <package>
  4. Check off the item in the workpad
  5. Commit: git add <specific files> && git commit -m "<imperative description>"
```

**Commit discipline:**
- Commit after each logical unit of work (not every file save, not everything at the end)
- Commit message format: `<type>: <short description>` (e.g., `feat: add email validation`, `fix: prevent null deref in auth`)
- Do not commit unrelated changes

### 2.3 Validate After Each Step

After implementing each TODO item, before moving on:
- Run: `pnpm test --filter <affected-package>`
- Fix any test failures before continuing
- If lint fails: fix it before the next commit

Do not accumulate a pile of broken state — fix issues immediately.

### 2.4 Handle Blockers

If you encounter a blocker mid-execution:
1. Note it in the workpad under a "Blockers" section
2. Set issue status: `multica issue status <issue-id> blocked`
3. Post a comment explaining what is needed
4. Set metadata: `multica issue metadata set <issue-id> --key blocked_reason --value "<reason>"`

### 2.5 Final Validation (Proof of Work)

When all TODO items are checked off, run the full suite:

```bash
# From repo root or in the affected workspace
pnpm test          # all unit + integration tests
pnpm lint          # ESLint
pnpm typecheck     # TypeScript type checking
pnpm build         # confirm build succeeds (if applicable)
```

All four must pass. Do not open a PR with a failing gate.

### 2.6 PR Feedback Sweep

If a PR already exists from a previous run, check for unresolved review comments before proceeding.

Use the `github` MCP tools:
- `get_pull_request_reviews` (`owner: AprovanLabs`, `repo: <repo>`, `pull_number: <n>`) — review decisions and review-level comments
- `get_pull_request_comments` (`owner: AprovanLabs`, `repo: <repo>`, `pull_number: <n>`) — inline code review comments

For each unresolved comment:
1. Address the requested change in code
2. Stage and commit the fix
3. Reply to the comment (or note resolution in the workpad)

After addressing all feedback, re-request review using the `github` MCP `create_pull_request_review` tool with `event: "COMMENT"` and a message that all feedback has been addressed. If the platform exposes a `request_reviewers` tool, use that instead.

If no PR exists yet, skip this step.

### 2.7 Open the PR

**One PR per issue.** Do not open multiple PRs for the same issue unless the issue has been explicitly decomposed into sub-issues. If you find a stale open PR from a prior run, push to that branch instead of opening a new one.

Push the branch first:
```bash
git push -u origin <branch-name>
```

Then use the `github` MCP `create_pull_request` tool with these parameters:
- `owner`: AprovanLabs
- `repo`: core (or patchwork — whichever was checked out)
- `title`: "<IDENTIFIER>: <short imperative description>"
- `body`:
  ```
  ## Summary

  <1-3 bullet points describing what changed and why>

  ## Changes

  - <file or component changed>: <what changed>

  ## Test Plan

  - [ ] <specific test or verification step>
  - [ ] All unit tests pass (`pnpm test`)
  - [ ] Lint and type checks pass

  Closes: <IDENTIFIER>

  🤖 Generated with [Claude Code](https://claude.com/claude-code)
  ```
- `head`: <current-branch-name>
- `base`: main

**PR description is required.** A PR without a Summary, Changes, and Test Plan is incomplete — do not open one.

The tool returns the PR URL — capture it for the next step.

### 2.8 CI-Wait Gate (Mandatory)

**Do not transition to `in_review` until CI is green.** This step is mandatory, not optional.

After `gh pr create` returns the PR URL:

1. Wait for CI to complete on the pushed commit:
   ```bash
   gh pr checks <pr-number> --watch
   ```

2. **If all checks pass**: proceed to §2.9 (Update State).

3. **If any check fails**:
   - Read the failure log: `gh run view --log-failed`
   - Fix the issue, commit, and push:
     ```bash
     git add <specific files>
     git commit -m "fix: <description of CI fix>"
     git push
     gh pr checks <pr-number> --watch
     ```
   - Repeat until all checks pass
   - **Do NOT** transition to `in_review` while CI is failing

**This gate exists because** transitioning to `in_review` before CI confirms green creates false confidence. A failing PR in `in_review` requires human intervention that the agent could have resolved.

### 2.9 Update State

After the PR is opened AND CI is green:

1. Update the workpad with PR URL and new phase
2. Transition issue: `multica issue status <issue-id> in_review`
3. Pin PR URL: `multica issue metadata set <issue-id> --key pr_url --value <url>`
4. Post result comment (mandatory — this is what the user sees):
   ```bash
   multica issue comment add <issue-id> --content "Implementation complete. PR: <url>

   Summary:
   - <what was built>
   - <tests written>
   - All CI gates passing (confirmed green)"
   ```

**Exit Phase 2**: PR opened, CI confirmed green, issue `in_review`.
