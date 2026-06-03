# Agent Configuration Refactor

**Status:** Draft
**Author:** Architect
**Issue:** [APR-52](mention://issue/fac38a36-26fc-4b28-ad21-c2700017810e)
**Date:** 2026-06-02

## Problem Statement

The current `.multica/` directory bundles platform-agnostic concepts (agent definitions, skills, MCP server configs) with Multica-specific platform config. This coupling makes it harder to reuse agent definitions across tools (Claude Code, OpenCode, Kiro), creates awkward naming conventions (`_defaults.json`, `_common.json`), and buries agent instructions inside JSON strings where they can't be read or edited naturally as Markdown. The SDD workflow also pushes intermediate plans into `docs/` when they belong in issues, and names like `docs/sdd/` and `sdd-planning` leak internal process terminology into the codebase.

## Goals

- Decouple platform-agnostic config (agents, skills, MCP) from Multica-specific config
- Make agent instructions readable and editable as first-class Markdown files
- Consolidate MCP server config into a single file with per-agent gating
- Enable cross-repo skill sharing via symlinks (`~/.agents/skills` → repo skills)
- Remove the `_<filename>` naming convention
- Restructure docs so plans live in issues and `docs/` holds architecture knowledge only
- Remove "sdd" branding from paths and skill names

## Non-Goals

- Changing the Multica platform API or CLI (this is a repo-level config restructure)
- Migrating existing issues or comments
- Changing how the Multica platform reads `.multica/` (a sync/build step will bridge the gap)

## Context & Background

**Current structure:**
```
.multica/
├── agents/          # 8 JSON files + _defaults.json
├── mcp/             # _common.json + per-agent overrides with "extends" pattern
├── skills/          # 13 SKILL.md dirs + _imports.json
├── squads/          # Team definitions
└── README.md
```

**Pain points from the issue:**
1. Agent instructions are JSON string values — hard to read, edit, and diff
2. `_common.json` + `"extends"` pattern for MCP is over-engineered (the issue says "this isn't k8s!")
3. `_defaults.json` / `_imports.json` underscore prefix feels ad-hoc
4. Skills and agents are Multica-agnostic concepts locked inside `.multica/`
5. `docs/sdd/` path and `sdd-planning` skill name leak process terminology
6. Plans end up in docs when they should be issues; docs should capture architecture knowledge

**Cross-repo context:** The `patchwork` repo has no `.multica/` directory. Agent/skill config is centralized in `core`. The user wants a symlink-based sharing model: `~/.agents/skills` points to the active repo's skills, and each repo's `.agents/skills` symlinks back, giving all tools one canonical location.

## Design Alternatives

### Option A — Flat top-level directories

Move everything to the repo root:
```
/agents/<name>.md
/skills/<name>/SKILL.md
/mcp.json
/.multica/           # only squads + platform bindings
```

**Pros:** Maximum visibility, easy to find.
**Cons:** Clutters root; mixing config with source code at top level.

### Option B — `.agents/` dotdir convention

Use a dotdir that isn't `.multica/`:
```
/.agents/
  agents/<name>.md
  skills/<name>/SKILL.md
  mcp.json
  defaults.json
/.multica/           # squads + platform bindings only
```

**Pros:** Keeps root clean. `.agents/` is a convention other tools can adopt. Symlink target for `~/.agents/`.
**Cons:** Another dotdir to learn.

### Option C — Hybrid (top-level `/agents/` and `/skills/`, root `mcp.json`)

```
/agents/<name>.md        # agent definitions as Markdown
/skills/<name>/SKILL.md  # skill definitions
/mcp.json                # consolidated MCP servers
/.multica/               # squads, defaults, platform bindings
```

**Pros:** Agents and skills are visible, MCP is a standard root config file (like `tsconfig.json`), `.multica/` stays lean.
**Cons:** Slightly more scattered than a single dotdir.

## Chosen Approach

**Option C — Hybrid**, with these specifics:

The user's issue description explicitly asks for `/agents` and `/skills` at the top level and a repo-level `mcp.json`. This matches Option C. The `.multica/` directory retains only what is genuinely Multica-platform-specific (squads, project metadata, import manifests).

## Technical Design

### New directory layout

```
core/
├── agents/                    # Agent definitions (Markdown + YAML frontmatter)
│   ├── defaults.json          # Shared defaults (runtimes, base settings)
│   ├── architect.md
│   ├── engineer.md
│   ├── backend-dev.md
│   ├── frontend-dev.md
│   ├── deep-researcher.md
│   ├── pm.md
│   ├── coordinator.md
│   └── data-scientist.md
│
├── skills/                    # Skill definitions (unchanged SKILL.md format)
│   ├── imports.json           # External skill sources (was _imports.json)
│   ├── brainstorming/SKILL.md
│   ├── code-review/SKILL.md
│   ├── design-planning/SKILL.md     # renamed from sdd-planning
│   ├── ...
│   └── workpad/SKILL.md
│
├── mcp.json                   # All MCP servers in one file
│
├── .multica/                  # Multica-platform-only config
│   ├── squads/
│   │   ├── core-engineering.json
│   │   └── product-team.json
│   └── README.md              # Explains what belongs here vs. top-level
│
├── docs/                      # Architecture knowledge base
│   ├── README.md
│   ├── tech-stack.md
│   ├── workflow.md
│   ├── agent-config-refactor.md    # This spec (example of architecture doc)
│   └── ...                         # Future architecture docs live here
│
└── ...
```

### Agent definition format (Markdown + YAML frontmatter)

Each agent is a `.md` file. The frontmatter holds structured metadata; the body is the agent's system instructions in natural Markdown.

```markdown
---
name: Architect
description: >
  System design lead. Authors design specs, makes authoritative
  architecture decisions, reviews PRs for structural soundness,
  and owns the docs/ knowledge base.
skills:
  - design-planning
  - code-review
  - workpad
  - brainstorming
mcp:
  - github
model: claude-opus-4-6
runtime: claude
multica:
  visibility: workspace
  max_concurrent_tasks: 2
---

You are the Architect agent for AprovanLabs. Your primary responsibilities are:

1. **System Design**: When assigned a design task, produce a design spec
   in docs/<slug>.md covering goals, context, design alternatives,
   the chosen approach, data models, API contracts, and open questions.
2. **Architecture Review**: When reviewing PRs or code, evaluate for
   modularity, scalability, security boundaries, naming clarity, and
   alignment with existing patterns. Flag structural issues, not just style.
3. **Decision Records**: Record significant architectural decisions in
   the spec or as a comment on the issue. Future agents will read
   these to understand the 'why'.
4. **Workpad discipline**: Maintain a persistent workpad comment on any
   multi-turn issue. Use the workpad skill to structure your plan
   before acting.
5. **Handoffs**: When your deliverable (spec, review, decision) is
   ready, transition the issue to in_review and tag the relevant
   human or PM agent.

Always prefer simple, composable, well-typed solutions over clever
abstractions. When in doubt, do less and document the trade-offs.
```

### `defaults.json` (was `_defaults.json`)

Moves to `/agents/defaults.json`. Identical content, minus the underscore prefix:

```json
{
  "runtimes": {
    "claude": {
      "id": "claude",
      "display_name": "Claude Code",
      "default_model": "claude-sonnet-4-6"
    },
    "opencode": {
      "id": "opencode",
      "display_name": "OpenCode",
      "default_model": "minimax-m3-free"
    },
    "gemini": {
      "id": "gemini",
      "display_name": "Gemini",
      "default_model": "gemini-2.5-pro"
    },
    "kiro": {
      "id": "kiro",
      "display_name": "Kiro",
      "default_model": "claude-sonnet-4-6"
    }
  },
  "defaults": {
    "visibility": "workspace",
    "max_concurrent_tasks": 2,
    "runtime": "claude"
  }
}
```

### Consolidated `mcp.json`

All MCP servers live in one root-level file. Per-agent gating is done by reading the agent's `mcp` frontmatter list — if an agent lists `["github"]`, it gets only the `github` server. No `_common.json`, no `extends`.

```json
{
  "servers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "./"],
      "env": {}
    },
    "fetch": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-server-fetch"],
      "env": {}
    },
    "memory": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-server-memory"],
      "env": {}
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"],
      "env": {}
    },
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp"],
      "env": {}
    }
  }
}
```

Agent frontmatter declares which servers it needs:
- `mcp: [github]` → agent gets only `github` from `mcp.json`
- `mcp: [github, playwright]` → agent gets both
- `mcp: null` or omitted → agent gets no MCP servers (or all, depending on platform default — decision for the sync layer)

### Symlink strategy for cross-repo skill sharing

```
~/.agents/skills/         ← symlink to active repo's /skills/
  └── (repo)/skills/      ← canonical source of skills for that repo

(each repo)/.agents/skills  ← symlink back to ~/.agents/skills
```

On bootstrap for the `core` repo, a setup script creates:
1. `~/.agents/skills` → `<core-repo-path>/skills/`
2. `<core-repo-path>/.agents/skills` → `~/.agents/skills`

This gives every tool on the machine (Claude Code, OpenCode, etc.) a single path to discover skills. The `.agents/` dotdir per-repo is a thin pointer, not a copy.

### Renamed concepts

| Before | After | Rationale |
|---|---|---|
| `docs/sdd/` | `docs/` (flat) | Specs are just architecture docs; no special subdirectory needed |
| `sdd-planning` skill | `design-planning` | Remove process jargon |
| `_defaults.json` | `defaults.json` | Drop underscore convention |
| `_common.json` | *(removed)* | Replaced by consolidated `mcp.json` |
| `_imports.json` | `imports.json` | Drop underscore convention |
| `.multica/agents/` | `/agents/` | Platform-agnostic |
| `.multica/skills/` | `/skills/` | Platform-agnostic |
| `.multica/mcp/` | `/mcp.json` | Single file, no directory |

### Sync/bridge layer

A `scripts/sync.sh` (or equivalent) bridges from the new canonical layout to `.multica/` for the platform:

1. Reads each `/agents/<name>.md`, extracts frontmatter, and writes the JSON agent definition the Multica platform expects into `.multica/agents/<name>.json`
2. Symlinks or copies `/skills/` into `.multica/skills/`
3. Generates per-agent MCP configs from `/mcp.json` + agent `mcp` metadata into `.multica/mcp/`

This keeps the Multica platform happy while the canonical source of truth is the new layout. The `.multica/agents/` and `.multica/mcp/` directories become generated artifacts (add to `.gitignore` or keep committed — team preference).

### Docs restructuring

- `docs/sdd/README.md` → `docs/README.md` (merge SDD guidance into docs README)
- Future architecture docs go directly in `docs/<slug>.md`
- The SDD template is renamed to "Design Spec Template" in `docs/README.md`
- Plans and intermediate task breakdowns stay in Multica issues, not in `docs/`
- `docs/` only receives finalized architecture knowledge: design specs for accepted decisions, module documentation, pattern guides

### Workflow improvements (skill and convention changes)

1. **PR quality requirement:** Add to agent instructions and the `symphony-execution` skill: "Every PR must have a structured description (Summary, Changes, Test plan). One PR per issue unless the scope is explicitly split."
2. **Code review automation:** Add to `symphony-review-merge` skill: "When a PR is opened, the Coordinator should assign the `code-review` skill to a reviewer agent. The reviewer posts approval or requests changes as a comment on the Multica issue with a link to the PR."
3. **Consolidated PRs:** Update `symphony-execution` to prefer a single PR per issue. Only split if the issue itself has been decomposed into sub-issues.

## Implementation Plan

1. **Create `/agents/` directory** — Convert all 8 agent JSON files to Markdown frontmatter format. Move `_defaults.json` → `agents/defaults.json`.
2. **Create `/skills/` directory** — Move all skill directories from `.multica/skills/` to `/skills/`. Rename `_imports.json` → `imports.json`. Rename `sdd-planning/` → `design-planning/`.
3. **Create `/mcp.json`** — Consolidate `_common.json` + per-agent overrides into a single file. Add `mcp` key to each agent's frontmatter.
4. **Slim down `.multica/`** — Keep only `squads/` and `README.md`. Remove `agents/`, `mcp/`, `skills/` (or mark as generated).
5. **Restructure `docs/`** — Merge `docs/sdd/README.md` into `docs/README.md`. Remove `docs/sdd/` directory. Update template to say "Design Spec" not "SDD".
6. **Update skills** — Rename `sdd-planning` → `design-planning` across all agent configs and skill references. Update `symphony-execution` and `symphony-review-merge` with PR quality and review automation guidance.
7. **Write sync script** — `scripts/sync.sh` to generate `.multica/` from the new canonical layout.
8. **Update documentation** — Update `WORKFLOW.md`, `docs/README.md`, `.multica/README.md` to reflect the new structure.

## Open Questions

- [ ] **Symlink bootstrap:** Should the `~/.agents/skills` symlink be managed by a setup script in the repo, or by the Multica platform itself? (owner: Jacob)
- [ ] **Generated vs committed:** Should `.multica/agents/` and `.multica/mcp/` (generated from the new layout) be gitignored or committed for portability? (owner: Jacob)
- [ ] **Default MCP servers:** When an agent omits the `mcp` key in frontmatter, should it get all servers or none? (owner: Jacob)
- [ ] **Squads:** Should squads also move out of `.multica/` to a top-level `/squads/` directory, or are they Multica-specific enough to stay? (owner: Jacob)
- [ ] **Patchwork repo:** Should `patchwork` get its own `/agents/` and `/skills/` or continue inheriting from the workspace? (owner: Jacob)

## References

- [APR-52 issue description](mention://issue/fac38a36-26fc-4b28-ad21-c2700017810e) — original requirements
- Claude Code agents configuration format (from issue description example)
- Current `.multica/` structure in `core` repo
