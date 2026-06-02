---
name: workpad
description: Manages the persistent workpad comment — the single source of truth for ongoing work on an issue. Use at the start of any multi-turn task and update it throughout.
triggers:
  - workpad
  - persistent comment
  - progress tracking
  - plan tracking
---

# Workpad Skill

The workpad is a single, persistent comment on a Multica issue that serves as the canonical source of truth for ongoing agent work. It is not a log — it is a living document maintained in-place throughout an issue's lifecycle.

## When to Use

Use the workpad pattern for any task that will require more than one agent turn or involves tracking a plan with multiple steps.

**Always create a workpad** when:
- Starting implementation on an issue (Phase 1 of the Symphony workflow)
- Continuing work on an issue from a prior run
- The issue has acceptance criteria that need to be tracked

**Do NOT create a new top-level comment for status** — edit the workpad comment in-place instead.

## Creating a Workpad

At the start of a new task, post the initial workpad as a comment:

```bash
multica issue comment add <issue-id> --content "## Agent Workpad

**Phase:** Plan
**Status:** Starting — building plan
**PR:** (not yet opened)

### Plan

- [ ] Understand requirements and read all context
- [ ] (further steps to be added)

### Notes

(Any relevant context, blockers, or decisions recorded here)
"
```

## Workpad Structure

```markdown
## Agent Workpad

**Phase:** Route | Plan | Execute | Review | Merge | Done
**Status:** <one-line current status>
**PR:** <url or "not yet opened">

### Plan

- [x] Completed item
- [ ] In-progress item
  - [ ] Sub-item
- [ ] Pending item

### Notes

<Context, decisions, blockers, reproduction evidence, etc.>
```

## Updating the Workpad

**Important**: Update the workpad comment in-place by editing it, not by posting a new comment. Future agent runs read the most recent version of the workpad to understand what's been done.

Since the Multica CLI does not currently expose a `comment edit` command, maintain the workpad by tracking the comment ID and updating it via comment replies only when the original is truly immutable. Prefer to post a clearly labeled follow-up: `## Agent Workpad (Updated)` with the full current state.

Workpad update events:
- After completing each TODO item (check it off)
- When opening a PR (update PR field)
- When blocked (update Status and add note)
- When moving to a new phase (update Phase)
- After receiving review feedback (add a review round section)

## Reading the Workpad on Re-Entry

When an agent is re-triggered on an issue:
1. `multica issue comment list <issue-id> --output json` — find the comment with `## Agent Workpad` heading
2. Read the Phase and Status fields to determine where to resume
3. Read the Plan checklist to see what's done and what's next
4. Check the PR field for any open PR URL

If no workpad exists → start Phase 1 (Plan).
If a workpad exists with an in-progress plan → resume Phase 2 (Execute).
If a workpad shows a PR URL → check PR status and go to Phase 3 or 4.

## Workpad vs. Result Comments

| Workpad | Result Comment |
|---|---|
| In-place tracking of ongoing work | One-time delivery of completed outcome |
| Read by future agent runs | Read by the user/human |
| Updated throughout the task | Posted once at milestone (PR opened, done) |
| Contains plan, progress, notes | Contains the deliverable or outcome |

Both are used: the workpad is internal state management; result comments are user-facing deliverables.
