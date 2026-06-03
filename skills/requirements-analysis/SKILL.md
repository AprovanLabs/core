---
name: requirements-analysis
description: Requirement decomposition, acceptance criteria authoring, and story mapping for the PM agent. Use to transform vague requests into well-structured Multica issues.
triggers:
  - requirements
  - user story
  - acceptance criteria
  - story mapping
  - decompose
  - clarify
---

# Requirements Analysis Skill

Use this skill to transform a vague request or problem statement into well-structured, implementable issues.

## When to Use

- You receive an ambiguous or high-level request
- A feature needs to be broken into sub-issues for parallel execution
- Acceptance criteria are missing or unclear
- You need to identify dependencies before work can begin

## Phase 1 — Understand the Need

Before writing any issues, answer:

1. **Who is this for?** (user role or system actor)
2. **What do they need to do?** (the action or capability)
3. **Why?** (the business or user outcome)
4. **What does "done" look like?** (observable, testable outcome)
5. **What is explicitly out of scope?** (prevents scope creep)

If you cannot answer these from the available context, post a clarifying comment on the issue before proceeding.

## Phase 2 — Write the Issue(s)

### Issue Title Format

`<Verb> <noun>: <brief context>`

Examples:
- `Add email verification to sign-up flow`
- `Fix: order total incorrect when discount applied`
- `Research: evaluate options for PDF generation`

### Description Template

```markdown
## Summary

One paragraph: what and why.

## Acceptance Criteria

- [ ] Criterion 1 (specific, testable, observable)
- [ ] Criterion 2
- [ ] Criterion 3

## Out of Scope

- Item explicitly not included

## Dependencies

- Blocked by: <APR-XX> (if any)
- Informs: <APR-XX> (if any)

## Notes

Any context, links, or constraints relevant to implementation.
```

### Acceptance Criteria Quality Bar

Each criterion must be:
- **Specific**: "Users can reset their password via email link" not "password works"
- **Testable**: an engineer can write a test that verifies it
- **Atomic**: one outcome per criterion (not "X and Y and Z")
- **Outcome-focused**: what the system does, not how it does it

Anti-patterns to avoid:
- "It should work correctly" — too vague
- "Handle all edge cases" — not testable
- "Improve performance" — no target metric
- "Refactor the module" — implementation detail, not outcome

## Phase 3 — Decompose Large Issues

Break issues when:
- Estimated scope is more than 2-3 days of work
- Multiple agents could work in parallel
- There are clear sequential dependencies
- The issue has more than 7 acceptance criteria

### Decomposition Strategies

**Vertical slices** (preferred): each sub-issue delivers a complete, working piece of functionality
- e.g., "Basic checkout → Add coupon support → Add saved payment methods"

**Horizontal layers** (when needed): split by technical layer
- e.g., "Data model migration", "API endpoint", "UI form"

**Sequential dependencies**: mark blocked sub-issues as `backlog` until their dependencies are done

### Sub-issue Creation

```bash
multica issue create \
  --title "..." \
  --description "..." \
  --parent <parent-issue-id> \
  --assignee <agent-name> \
  --priority <priority> \
  --status todo   # or backlog if blocked
```

## Phase 4 — Prioritize

Set priority based on:

| Priority | When |
|---|---|
| urgent | Production incident or blocking a release |
| high | Directly impacts user experience or key KPI |
| medium | Valuable but not time-sensitive |
| low | Nice to have, can wait |

## Deliverables

After running this skill:
- [ ] All issues have clear titles and descriptions
- [ ] Every issue has testable acceptance criteria
- [ ] Dependencies are identified and linked
- [ ] Assignees and priorities are set
- [ ] Parent-child relationships established
- [ ] Blocked sub-issues are in `backlog` status
