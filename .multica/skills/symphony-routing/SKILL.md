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

## Routing Algorithm

Gather the following signals, then apply the routing table:

### Signal 1: Issue Status

```bash
multica issue get <issue-id> --output json | jq '.status'
```

### Signal 2: Existing Workpad

Search comment list for a comment containing `## Agent Workpad`:

```bash
multica issue comment list <issue-id> --output json | \
  python3 -c "import json,sys; comments=json.load(sys.stdin); \
  wp=[c for c in comments if '## Agent Workpad' in c.get('content','')] ; \
  print('found' if wp else 'none', wp[0]['id'] if wp else '')"
```

### Signal 3: Existing PR

Check issue metadata first (fast):
```bash
multica issue metadata list <issue-id> --output json | jq '.pr_url // empty'
```

If not in metadata, search GitHub (slower):
```bash
gh pr list --search "<issue-identifier>" --state open --json url,number,state
```

### Signal 4: PR State

If a PR URL is known:
```bash
gh pr view <number> --json state,mergeable,reviewDecision,statusCheckRollup
```

### Signal 5: Blocker Status

```bash
multica issue metadata list <issue-id> --output json | jq '.blocked_reason // empty'
```

## Routing Table

| Issue Status | Workpad | PR | PR State | Route To |
|---|---|---|---|---|
| `todo` | none | none | — | **Phase 1: Plan** |
| `todo` | none | none | — | **Phase 1: Plan** (first run) |
| `in_progress` | exists | none | — | **Phase 2: Execute** (resume) |
| `in_progress` | exists | open | CI failing | **Phase 2: Fix CI** |
| `in_review` | exists | open | Changes requested | **Phase 3: Review Response** |
| `in_review` | exists | open | Approved | **Phase 4: Merge** |
| `in_review` | exists | merged | — | **Phase 4: Close** (PR already merged) |
| `blocked` | any | any | — | **Investigate Blocker** |
| `done` | any | merged | — | **Nothing to do** — post a comment and exit |

## Ambiguous Cases

**Workpad exists but status is `todo`**: Prior run may have created a workpad but not set status. Treat as Phase 2 (resume) — do not start over.

**PR exists but issue is `todo` or `in_progress`**: The PR was opened but status wasn't updated. Transition to `in_review` and proceed to Phase 3.

**Multiple open PRs**: Pick the most recent one. Comment noting the ambiguity.

**Stale workpad (attempt N > 1, no progress visible)**: Reconcile — check GitHub for any existing branches or partial work before starting fresh.

## Output of Routing

After routing, you should know:
1. Which phase you are in
2. What the workpad says (if it exists)
3. Whether a PR exists and what state it's in
4. Any blockers

Document your routing decision in the workpad (or create one if Phase 1).

## Retry and Stall Detection

If `attempt` > 1 and the issue is stuck in the same state:
- Check if the prior agent's work is partially done on a branch
- Check CI for failures that need addressing
- If truly stuck: set status `blocked` and post a comment explaining what's needed

If `attempt` > 3 with no progress: set status `blocked` and escalate.
