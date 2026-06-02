# Software Design Documents

This directory contains SDDs (Software Design Documents) for significant architectural decisions at AprovanLabs.

## When to Write an SDD

Write an SDD when:
- Introducing a new service, subsystem, or significant package
- Making a cross-cutting architectural decision (auth strategy, data model, API contract)
- Choosing between multiple competing technical approaches
- The implementation scope is large enough that alignment is needed before work begins

You do NOT need an SDD for:
- Bug fixes (even large ones)
- UI-only changes
- Adding a new field to an existing model
- Refactoring within a well-understood scope

If in doubt: start an SDD draft. It forces clarity even if the doc ends up short.

## Authoring

1. Use the `sdd-planning` skill to guide the authoring process
2. File name: `<slug>.md` — lowercase, hyphens, max 40 characters
3. Keep the Status field current: Draft → In Review → Accepted → Superseded

## SDD Template

```markdown
# <Title>

**Status:** Draft
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

## Index

| File | Topic | Status | Date |
|---|---|---|---|
| *(none yet)* | | | |
