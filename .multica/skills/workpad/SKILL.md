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

**Do NOT create a new top-level comment for status** — post an updated workpad comment instead (see Updating the Workpad below).

## Creating a Workpad (First Run)

At the start of a new task, post the initial workpad as a comment. Include a brief issue summary parsed from the description so future runs have context without re-reading the full issue.

```bash
multica issue comment add <issue-id> --content "## Agent Workpad

**Summary:** <1-2 sentence summary of what this issue asks for, parsed from description>

**Phase:** Plan
**Status:** Starting — building plan
**PR:** (not yet opened)

### Plan

- [ ] Understand requirements and read all context
- [ ] (further steps to be added after exploration)

### Notes

(Blockers, decisions, and relevant context recorded here)
"
```

The summary should be a concise digest of the issue title and key acceptance criteria — enough for a future agent to understand the goal without re-reading the full description.

## Workpad Structure

```markdown
## Agent Workpad

**Summary:** <digest of what this issue is about>

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

**The Multica CLI does not currently expose a `comment edit` command.** To "update" the workpad, post a new comment with the full updated state using the `## Agent Workpad (Updated)` header. Future runs search for the most recent comment containing `## Agent Workpad` (original or updated).

```bash
multica issue comment add <issue-id> --content "## Agent Workpad (Updated)

**Summary:** <same summary as original>

**Phase:** Execute
**Status:** Implementing — 3 of 5 items done
**PR:** (not yet opened)

### Plan

- [x] Understand requirements and read all context
- [x] Explore relevant code
- [x] Implement feature X
- [ ] Write tests
- [ ] Open PR

### Notes

Found that feature X depends on Y — adjusted plan accordingly.
"
```

Update the workpad after:
- Completing each TODO item (check it off)
- Opening a PR (update PR field and phase)
- Encountering a blocker (update Status and add note)
- Moving to a new phase (update Phase)
- Receiving review feedback (add a review round section)

## Reading the Workpad on Re-Entry (Continuation)

When an agent is re-triggered on an issue, find and read the workpad before doing anything else:

```bash
# Fetch the most recently active threads (cap: 20) to find the workpad comment
multica issue comment list <issue-id> --recent 20 --output json | \
  python3 -c "
import json, sys
comments = json.load(sys.stdin)
# Each entry under --recent is a thread root with a 'replies' field
all_comments = []
for thread in comments:
    all_comments.append(thread)
    all_comments.extend(thread.get('replies', []))
workpads = [c for c in all_comments if '## Agent Workpad' in c.get('content', '')]
if workpads:
    # Pick the most recently created workpad comment
    latest = sorted(workpads, key=lambda c: c['created_at'])[-1]
    print('FOUND', latest['id'])
    print(latest['content'])
else:
    print('NONE')
"
```

Use what you find to determine where to resume:

| Workpad State | Action |
|---|---|
| No workpad found | Start Phase 1 — create workpad, build plan |
| Workpad with in-progress plan (items unchecked) | Resume Phase 2 — find first unchecked item |
| Workpad with PR URL | Check PR status → Phase 3 (review) or Phase 4 (merge) |
| Workpad Phase = Done | Issue is complete — no action needed |

## Completing the Workpad (Final Update)

When the work is fully done (PR merged or issue resolved without a PR), post a final workpad update with all items checked, the PR link, and a brief summary.

```bash
multica issue comment add <issue-id> --content "## Agent Workpad (Updated)

**Summary:** <same summary as original>

**Phase:** Done
**Status:** Complete
**PR:** <url>

### Plan

- [x] Understand requirements and read all context
- [x] Explore relevant code
- [x] Implement <feature>
- [x] Write tests
- [x] Open PR
- [x] PR reviewed and merged

### Notes

**Completed:** <brief summary of what was built and any key decisions>
"
```

After posting the final workpad, transition the issue status to `done`:
```bash
multica issue status <issue-id> done
```

## Workpad vs. Result Comments

| Workpad | Result Comment |
|---|---|
| In-place tracking of ongoing work | One-time delivery of completed outcome |
| Read by future agent runs | Read by the user/human |
| Updated throughout the task | Posted once at milestone (PR opened, done) |
| Contains plan, progress, notes | Contains the deliverable or outcome |

Both are used: the workpad is internal state management; result comments are user-facing deliverables. A completed issue should have both a final workpad update (Phase: Done) and a result comment (e.g. "Implementation complete. PR: https://...").
