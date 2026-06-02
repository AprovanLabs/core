# AprovanLabs Development Workflow

Human-readable companion to `WORKFLOW.md` at the repo root. The `WORKFLOW.md` is the machine-readable orchestration policy; this doc explains the concepts and practices for agents and humans.

## Overview: Symphony-Compatible Workflow

AprovanLabs uses an adapted Symphony workflow where Multica is the issue tracker and agent dispatch system. Agents follow a five-phase lifecycle for every issue:

```
Route → Plan → Execute → Review → Merge
 (0)     (1)     (2)       (3)      (4)
```

Each phase has clear entry conditions, actions, and exit criteria.

## The Workpad Pattern

Every multi-turn issue gets a **persistent workpad comment** — a single top-level comment maintained by the agent as the source of truth for ongoing work. The workpad is not a log; it is a living document that stays current.

**What the workpad contains:**
- Current phase and status
- Hierarchical TODO list with checkboxes
- Reproduction evidence (for bugs)
- PR URL (once opened)
- Current blockers

**Rules:**
- Create the workpad comment at the start of Phase 1 (Plan)
- Update it in-place — never create additional top-level status comments
- Check off items as they are completed
- Add the PR URL as soon as the PR is opened

## Phase 0 — Route

**Entry:** Agent run begins (assignment trigger or mention).

**Actions:**
1. Read the issue in full (title, description, all comments)
2. Read issue metadata for any pinned state (PR URL, blockers)
3. Check for an existing workpad comment
4. Check for an existing PR/branch on GitHub

**Routing decisions:**
- No workpad, no PR, status `todo` → Go to Phase 1 (Plan)
- Workpad exists, no PR, status `in_progress` → Go to Phase 2 (continue implementation)
- PR exists, status `in_review` → Go to Phase 3 (review response)
- PR merged, status `in_review` → Go to Phase 4 (merge/close)
- Status `blocked` → Investigate blocker; post update; stay blocked or resolve and continue

## Phase 1 — Plan

**Entry:** Issue is `todo` with no prior workpad.

**Actions:**
1. Set issue status to `in_progress`
2. Create a workpad comment with initial plan structure
3. Decompose the issue into a hierarchical TODO list
4. For bug fixes: reproduce the issue and record evidence in the workpad
5. For new features: identify affected files and design the approach
6. Sync with main: `git fetch origin && git rebase origin/main`

**Exit:** Workpad exists with a clear implementation plan → proceed to Phase 2.

## Phase 2 — Execute

**Entry:** Workpad exists with a plan; implementation is not yet complete.

**Actions:**
1. Work through TODO items one at a time — complete and validate each before moving on
2. After each significant change: run tests and lint
3. Keep the workpad updated as items are completed
4. Commit frequently with descriptive messages
5. When all TODOs are complete:
   - Run the full CI validation suite (`pnpm test`, `pnpm lint`, `pnpm typecheck`)
   - Open a PR with a clear title and description
   - Update the workpad with the PR URL
   - Transition issue to `in_review`
   - Post a result comment: "PR opened: <url>"

**Exit:** PR opened, CI green, issue in `in_review`.

## Phase 3 — Review Response

**Entry:** Issue is `in_review`; PR exists; human review has been requested or feedback has been given.

**Actions:**
1. Check the PR for human review feedback
2. If changes are requested:
   - Set issue back to `in_progress`
   - Address all review comments in a new commit (never force-push)
   - Re-request review
   - Update the workpad
3. If approved → proceed to Phase 4

**Rules:**
- Do NOT modify code while waiting for review (no speculative improvements)
- Address all comments — even if you disagree, reply with your reasoning
- Never re-request review without addressing the feedback first

**Exit:** PR approved by all required reviewers → proceed to Phase 4.

## Phase 4 — Merge

**Entry:** PR is approved; CI is green.

**Actions:**
1. Rebase on main if behind: `git fetch origin && git rebase origin/main`
2. Confirm CI passes on rebased state
3. Merge the PR (squash merge to keep main history clean)
4. Transition issue to `done`
5. Update the workpad: "Merged. Issue closed."
6. Delete the feature branch (GitHub does this automatically if configured)

**Exit:** PR merged, issue `done`, branch deleted.

## SDD Workflow

For design-heavy issues, use the SDD-first approach:
1. Author a Software Design Document in `docs/sdd/<slug>.md`
2. Open a PR for the SDD itself
3. Get SDD reviewed and approved
4. Create implementation sub-issues linked to the SDD
5. Execute sub-issues following the standard Symphony phases

See `docs/sdd/README.md` for the SDD template.

## Proof of Work

Before transitioning to `in_review`, agents must confirm:
- [ ] All tests pass (`pnpm test`)
- [ ] No lint errors (`pnpm lint`)
- [ ] No type errors (`pnpm typecheck`)
- [ ] CI GitHub Actions run is green
- [ ] PR description explains what changed and why
- [ ] Workpad is updated with PR URL

This is the "proof of work" gate — non-negotiable before state transition.

## Communication Rules

- **Results are only visible via comments**: Terminal output and assistant text are not delivered to the user. Always post results via `multica issue comment add`.
- **Mentions trigger runs**: Only mention another agent when you intentionally want them to act. Avoid reply loops.
- **Keep comments concise**: State the outcome, not the process. "Fixed the login redirect. PR: #123" not "1. I read the issue 2. Found the bug..."
