---
name: design-planning
description: Guides the Architect through authoring a design spec. Use this skill at the start of any design or architecture task before writing code or opening a PR.
triggers:
  - design
  - architecture
  - design spec
  - technical design
  - system design
---

# Design Planning Skill

Use this skill when you need to author a design spec before implementation begins.

## When to Use

Trigger this skill when:
- You are assigned an issue tagged as a design or architecture task
- An issue description says "design first" or "write a spec"
- The implementation scope is large enough to warrant documenting decisions upfront
- You are the Architect agent and a new component or service is being introduced

## Phase 1 — Understand Requirements

1. Read the issue description and all comments in full.
2. Identify the **problem statement**: what user or system need is being addressed?
3. List the **constraints**: performance targets, compatibility requirements, security boundaries, budget.
4. Identify **stakeholders**: which agents or humans will review this spec?
5. Post a workpad comment with your understanding before proceeding (use the workpad skill).

## Phase 2 — Research Existing Context

1. Check `docs/` for any existing architecture docs or relevant spec files.
2. Search the codebase for existing patterns related to this problem domain.
3. Identify what already exists that the design must integrate with or extend.
4. Note any prior decisions recorded in related issue comments.

## Phase 3 — Draft the Spec

Create the file at `docs/<slug>.md` (slug = lowercase, hyphens, max 40 chars).

### Design Spec Template

```markdown
# <Title>

**Status:** Draft | In Review | Accepted | Superseded
**Author:** <agent-name>
**Issue:** <APR-XX link>
**Date:** YYYY-MM-DD

## Problem Statement

One paragraph: what problem are we solving and why does it matter now?

## Goals

- Goal 1
- Goal 2

## Non-Goals

- Out of scope item 1
- Out of scope item 2

## Context & Background

Relevant context: existing systems involved, prior decisions, constraints.

## Design Alternatives

### Option A — <Name>

Description. Pros. Cons.

### Option B — <Name>

Description. Pros. Cons.

## Chosen Approach

Which option and why. Key trade-offs accepted.

## Technical Design

### Data Model

\`\`\`
<schema, types, or ER diagram>
\`\`\`

### API / Interface Contracts

Key interfaces, API endpoints, or event schemas.

### Component Diagram

\`\`\`
<ASCII or Mermaid diagram>
\`\`\`

### Sequence Diagrams

Key flows as sequence diagrams.

## Implementation Plan

Ordered list of implementation steps, broken into sub-issues where appropriate.

## Open Questions

- [ ] Question 1 (owner: ?)
- [ ] Question 2 (owner: ?)

## References

- Link 1
- Link 2
```

## Phase 4 — Review & PR

1. Commit the spec to a branch: `git checkout -b docs/<slug>`.
2. Open a PR with title `docs: design spec for <topic>`.
3. Request review from the Architect (if you are not the Architect) or a human owner.
4. Transition the issue to `in_review`.
5. Update the workpad comment with PR URL and status.

## Phase 5 — Iterate

- Address review comments directly in the spec file.
- For each round of feedback, push commits and update the workpad.
- When all reviewers approve, merge and transition the issue to `done`.
- Pin the `pr_url` to issue metadata if it was not already done.
