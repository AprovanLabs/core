---
name: symphony-routing
description: Phase 0 of the Symphony workflow. Determines what an agent should do based on issue state, existing work artifacts, and blocker status. Use at the start of every agent run.
triggers:
  - routing
  - dispatch
  - what phase
  - where to start
  - issue state
---

# Symphony Routing Skill (Phase 0)

Use this skill at the very start of every agent run on an issue. It reads the issue state and all available signals to determine which Symphony phase to execute.

## When to Use

Run this skill immediately after the pre-flight steps (reading the issue, metadata, and comment history). Every agent run should route before acting.

## Pre-Flight Steps

Before routing, always run these three reads:

```bash
# 1. Get full issue details
multica issue get <issue-id> --output json

# 2. Check metadata for prior-run artifacts (pr_url, blocked_reason, etc.)
multica issue metadata list <issue-id> --output json

# 3. Read full comment history (mandatory — prior context lives here)
multica issue comment list <issue-id> --output json
```

## Signal Collection

Gather all five signals before applying the routing table.

### Signal 1: Issue Status

From the `issue get` output above: `.status`

Possible values: `todo`, `in_progress`, `in_review`, `blocked`, `done`, `cancelled`, `backlog`

### Signal 2: Existing Workpad

Search the comment list for a comment containing `## Agent Workpad`:

```bash
multica issue comment list <issue-id> --output json | \
  python3 -c "
import json, sys
comments = json.load(sys.stdin)
wp = [c for c in comments if '## Agent Workpad' in c.get('content', '')]
print('found', wp[0]['id'] if wp else 'none')
"
```

If found, read the workpad's `**Phase:**` and `**Status:**` fields and the plan checklist to understand where prior work left off.

### Signal 3: Existing PR

Check metadata first (fast path):
```bash
multica issue metadata list <issue-id> --output json | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('pr_url','none'))"
```

If not in metadata, search GitHub using the `github` MCP `list_pull_requests` tool:
- `owner`: AprovanLabs
- `repo`: core (or patchwork — check project resources)
- `state`: all
- `head`: <branch-name-slug> (optional filter)

Or use `search_issues` with query `<issue-identifier> is:pr repo:AprovanLabs/core`.

### Signal 4: PR State

If a PR URL is known, get full state using the `github` MCP `get_pull_request` tool:
- `owner`: AprovanLabs
- `repo`: core (or patchwork)
- `pull_number`: <number from pr_url>

Key fields to check: `state` (open/closed/merged), `reviewDecision` (APPROVED / CHANGES_REQUESTED / null).

For CI status, use the `github` MCP `get_pull_request_status` tool with the same parameters.

### Signal 5: Blocker Status

Check two places:

**5a. Metadata blocked_reason:**
```bash
multica issue metadata list <issue-id> --output json | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('blocked_reason','none'))"
```

**5b. Blocked-by relations in the issue description:**

Look for lines matching `**Blocked by:**` in the issue description. For each listed issue, fetch its status:
```bash
multica issue get <blocking-issue-id> --output json | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['identifier'], d['status'])"
```

A blocker is **active** if its status is not `done` or `cancelled`. Active blockers mean this issue cannot proceed until they resolve.

### Signal 6: Attempt Number

Check how many prior runs this issue has had:
```bash
multica issue runs <issue-id> --output json | python3 -c "import json,sys; runs=json.load(sys.stdin); print(len(runs))"
```

- `0` or `1`: first run — start fresh
- `>= 2`: continuation or retry — read workpad carefully, do not repeat completed work

## Routing Table

Apply the first matching row top-to-bottom:

| Issue Status | Workpad | PR | PR State | → Route To |
|---|---|---|---|---|
| `done` | any | any | — | **Exit** — post a note and stop |
| `cancelled` | any | any | — | **Exit** — post a note and stop |
| `blocked` | any | any | — | **Investigate Blocker** (see below) |
| `todo` | none | none | — | **Phase 1: Plan** (fresh start) |
| `todo` | exists | none | — | **Phase 2: Execute** (workpad exists, resume — do not restart) |
| `todo` | exists | open | CI failing | **Phase 2: Fix CI** |
| `todo` | exists | open | Approved | **Phase 4: Merge** — also update status to `in_review` |
| `in_progress` | none | none | — | **Phase 1: Plan** (status advanced but no workpad yet — create one) |
| `in_progress` | exists | none | — | **Phase 2: Execute** (resume from workpad) |
| `in_progress` | exists | open | CI failing | **Phase 2: Fix CI** |
| `in_progress` | exists | open | Changes requested | **Phase 3: Review Response** — also update status to `in_review` |
| `in_progress` | exists | open | Approved | **Phase 4: Merge** — also update status to `in_review` |
| `in_review` | exists | open | Changes requested | **Phase 3: Review Response** |
| `in_review` | exists | open | Approved | **Phase 4: Merge** |
| `in_review` | exists | merged | — | **Phase 4: Close** (PR merged, close issue) |
| `backlog` | any | any | — | **Exit** — issue not yet scheduled, post a note and stop |

## After Routing: What to Do

| Route | Skill to Apply |
|---|---|
| Phase 1: Plan | Use **symphony-execution** skill (Phase 1 section) |
| Phase 2: Execute / Fix CI | Use **symphony-execution** skill (Phase 2 section) |
| Phase 3: Review Response | Use **symphony-review-merge** skill (Phase 3 section) |
| Phase 4: Merge / Close | Use **symphony-review-merge** skill (Phase 4 section) |
| Investigate Blocker | See blocker handling below |
| Exit | Post a brief comment stating current state, then stop |

## Research-to-Implementation Gate

**Do not route a research output directly to implementation.** When an issue type is "research" or "investigation" and the research deliverable has been posted (as a comment or doc), the flow is:

1. **Research agent** posts findings as an issue comment and sets status to `in_review`
2. **PM or Coordinator** reviews the findings, creates sub-issues for each concrete action item, and sets status to `done` on the research issue (or transitions sub-issues to `todo`)
3. **Implementing agents** (Engineer, Backend Dev, Frontend Dev) pick up the sub-issues

**How to detect a research task:** the issue description contains phrases like "research", "investigate", "audit", "compare", "analysis", or the Coordinator tagged it for the Deep Researcher.

**When routed as an engineer to a research-complete issue:** if you see only a research report with no actionable sub-issues and no code branch, do NOT start implementing. Instead:
- Verify the research is complete (findings comment posted)
- Create sub-issues for each action item identified in the research
- Set each sub-issue to `todo` with an appropriate assignee
- Post a comment summarizing the decomposition
- Transition the parent issue to `done` (research phase complete)

## Blocker Handling

When routed to **Investigate Blocker** (issue status is `blocked`, or active blocked-by relations found):

1. **Identify what is blocking:** read `blocked_reason` metadata, issue description, and the most recent comments
2. **Check if blocker is resolved:** fetch each blocking issue — if all are `done`/`cancelled`, the block is cleared
3. **If block is cleared:** remove `blocked_reason` metadata, transition issue to `in_progress`, and proceed to the appropriate phase
4. **If block is NOT resolved:**
   - Determine if you can unblock it within scope (e.g., the blocker is a sub-task you can implement)
   - If yes: complete the blocking work first, then resume
   - If no: post a comment explaining what is needed, ensure `blocked_reason` metadata is set, leave issue as `blocked`
5. **Escalate if stuck:** if the blocker requires human decision, post a comment mentioning the issue owner

```bash
# Clear a resolved blocker
multica issue metadata delete <issue-id> --key blocked_reason
multica issue status <issue-id> in_progress

# Set/update a blocker
multica issue metadata set <issue-id> --key blocked_reason --value "<concise description>"
multica issue status <issue-id> blocked
```

## Ambiguous Cases

**PR exists but issue is `todo` or `in_progress`:** The PR was opened but issue status was not updated. Transition status to `in_review` and proceed to Phase 3.

**Multiple open PRs:** Pick the most recent one by creation date. Add a comment noting the ambiguity.

**Stale workpad (attempt ≥ 2, same state):** Before restarting, check for prior branch work:
```bash
git branch -a | grep -i "<issue-identifier-slug>"
```
Also use the `github` MCP `list_pull_requests` tool (`owner: AprovanLabs`, `repo: <repo>`, `state: all`) to find stale PRs.
Resume from existing work rather than starting fresh.

**Workpad Phase says "Plan" but no code committed:** Resume Phase 1 — finish the plan and begin execution.

**CI failing on a previously-passing PR (attempt ≥ 2):** Route to Phase 2 (Fix CI). Read the CI failure log before touching code.

## Retry and Stall Detection

If `attempt` > 1 and the issue is stuck in the same state with no visible progress:
1. Check `git log` for commits since the issue was created
2. Check CI results: use the `github` MCP `get_pull_request_status` tool (`owner: AprovanLabs`, `repo: <repo>`, `pull_number: <n>`)
3. If a branch exists with work: read it — don't throw it away
4. If truly stuck with no path forward: set status `blocked`, set `blocked_reason` metadata, post a comment explaining the specific obstacle

If `attempt` > 3 with no forward movement: escalate by setting `blocked` and posting a comment that clearly names what decision or action is needed from a human.

## Output of Routing

After completing routing, document your decision in the workpad (create one if Phase 1):

```markdown
**Phase:** Route → Phase N
**Routing decision:** <one sentence: why this phase>
**Signals:** status=<x> | workpad=<found/none> | PR=<url or none> | attempt=<n>
```

Then proceed immediately to the identified phase skill.
