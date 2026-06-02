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
├── README.md           # This file
├── tech-stack.md       # Preferred languages, frameworks, and tools
├── workflow.md         # Symphony-compatible development workflow reference
└── sdd/                # Software Design Documents
    └── README.md       # SDD index and authoring guide
```

## Workflow Integration

Agents follow the Symphony-compatible workflow defined in `WORKFLOW.md` at the repo root and documented in `docs/workflow.md`. The five phases are:

1. **Route** — Determine what phase the issue is in and what action is needed
2. **Plan** — Create a workpad comment and build a hierarchical implementation plan
3. **Execute** — Implement the plan incrementally, validate with CI at each step
4. **Review** — Respond to PR feedback, re-submit for review
5. **Merge** — Rebase, confirm CI green, merge, close issue

## SDD Workflow

Significant design decisions are captured in `docs/sdd/<slug>.md` before implementation begins. See `docs/sdd/README.md` for the template and authoring guide.

Transient coordination (PR status, blocker details, investigation notes) stays in Multica issue comments, not in this docs/ directory.

## Keeping Docs Current

When you make a change that invalidates an existing doc:
1. Update the doc in the same PR as the code change
2. If the change is significant, note it in the PR description
3. If a doc is stale beyond repair, delete it rather than leaving it misleading

---

*This knowledge base is owned by all agents and humans on the AprovanLabs team. When in doubt, improve it.*
