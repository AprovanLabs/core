# AprovanLabs Engineering Docs

Shared knowledge base for agents and humans working in the AprovanLabs codebase. These docs are the version-controlled source of truth that complements the transient issue/comment workflow in Multica.

## When to Write a Doc

Write (or update) a doc when:

- You make an architectural decision others will need to understand
- You establish a pattern that should be followed consistently
- You set up a system that others will operate or extend
- A piece of knowledge took significant effort to discover and will be needed again

**Don't** create a doc for things that belong in Multica issues (task-specific context, investigation notes, PR status). Docs are for durable knowledge; issues are for work coordination.

## Directory Structure

```
docs/
├── README.md                    # This file
├── tech-stack.md                # Preferred languages, frameworks, and tools
├── workflow.md                  # Symphony-compatible development workflow reference
├── agent-config-refactor.md     # Design spec: agent config restructure (APR-52)
└── <slug>.md                    # Future architecture docs go here (flat, no subdirectories)
```

## Workflow Integration

Agents follow the Symphony-compatible workflow defined in `WORKFLOW.md` at the repo root and documented in `docs/workflow.md`. The five phases are:

1. **Route** — Determine what phase the issue is in and what action is needed
2. **Plan** — Create a workpad comment and build a hierarchical implementation plan
3. **Execute** — Implement the plan incrementally, validate with CI at each step
4. **Review** — Respond to PR feedback, re-submit for review
5. **Merge** — Rebase, confirm CI green, merge, close issue

## Design Spec Workflow

Significant architectural decisions are captured as design specs directly in `docs/<slug>.md` before implementation begins. Use the `design-planning` skill to guide the authoring process.

**File naming:** `<slug>.md` — lowercase, hyphens, max 40 characters. No subdirectories.

**When to write a design spec:**

- Introducing a new service, subsystem, or significant package
- Making a cross-cutting architectural decision (auth strategy, data model, API contract)
- Choosing between multiple competing technical approaches
- The implementation scope is large enough that alignment is needed before work begins

You do NOT need a design spec for:

- Bug fixes (even large ones)
- UI-only changes
- Adding a new field to an existing model
- Refactoring within a well-understood scope

### Design Spec Template

```markdown
# <Title>

**Status:** Draft | In Review | Accepted | Superseded
**Author:** <agent-name or human>
**Issue:** [APR-XX](mention://issue/<uuid>)
**Date:** YYYY-MM-DD

## Problem Statement

One paragraph: what problem are we solving and why now?

## Goals

- Goal 1
- Goal 2

## Non-Goals

- Out of scope

## Context & Background

Relevant context: existing systems, constraints, prior decisions.

## Design Alternatives

### Option A — <Name>

Description. Pros. Cons.

### Option B — <Name>

Description. Pros. Cons.

## Chosen Approach

Which option and why.

## Technical Design

### Data Model

<schema or types>

### API Contracts

<endpoints or interfaces>

### Component Diagram

<ASCII or Mermaid diagram>

## Implementation Plan

1. Step 1 ([APR-XX](mention://issue/<uuid>))
2. Step 2

## Open Questions

- [ ] Question (owner: ?)

## References

- Link
```

## Keeping Docs Current

When you make a change that invalidates an existing doc:

1. Update the doc in the same PR as the code change
2. If the change is significant, note it in the PR description
3. If a doc is stale beyond repair, delete it rather than leaving it misleading

---

_This knowledge base is owned by all agents and humans on the AprovanLabs team. When in doubt, improve it._
