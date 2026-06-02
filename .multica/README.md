# .multica/

Versioned Multica artifact definitions for the AprovanLabs workspace. These files are the source of truth for agents, skills, squads, and MCP configuration. A sync script reads from this directory and applies changes to the Multica platform via the `multica` CLI.

## Directory Structure

```
.multica/
├── agents/
│   ├── _defaults.json       # Shared defaults: runtime refs, visibility, max_concurrent_tasks
│   └── <name>.json          # Individual agent definitions (added in APR-36)
├── skills/
│   ├── _imports.json        # External skill sources (skills.sh URLs, GitHub)
│   └── <name>/              # Local skill content (SKILL.md + templates) (added in APR-37)
├── squads/
│   └── <name>.json          # Squad definitions with leader and member lists (added in APR-41)
├── mcp/
│   └── _common.json         # Shared MCP server stubs for common development tools
└── README.md                # This file
```

## Subdirectory Purpose

### `agents/`

Contains one JSON file per agent definition. `_defaults.json` provides shared values (runtime references for Claude, OpenCode, Gemini, and Kiro; default visibility and concurrency) that individual agent files may override.

### `skills/`

Two types of entries:
- **`_imports.json`** — A list of external skills to pull from skills.sh or GitHub URLs. The sync script calls `multica skill import --url <url>` for each entry.
- **`<name>/`** subdirectories — Locally authored skills, each containing a `SKILL.md` and optional template files. The sync script creates or updates these via `multica skill create/update` and `multica skill files upsert`.

### `squads/`

One JSON file per squad. Each file names the squad's leader agent and its member agents. Currently empty; squad definitions will be added in APR-41 once the agent definitions (APR-36) are ready.

### `mcp/`

MCP server configuration stubs. `_common.json` lists servers relevant to all or most agents (GitHub, filesystem, web fetch). Per-agent overrides can be added as `<agent-name>.json`. These are ready to sync once Multica ships a CLI surface for per-agent MCP config.

## Sync Workflow

A `sync.sh` script (added in APR-40) will make this declarative config live by diffing local definitions against current Multica state and applying creates/updates. It is designed to be idempotent — safe to run at any time.

**Rough flow:**
1. Load `agents/_defaults.json` for shared values.
2. For each `agents/<name>.json`, create or update the agent via `multica agent create/update`.
3. For each entry in `skills/_imports.json`, import via `multica skill import --url`.
4. For each `skills/<name>/`, sync local skill files via `multica skill files upsert`.
5. Assign skills to agents per their `skills` arrays.
6. For each `squads/<name>.json`, create/update the squad and its membership.

## Secrets

Do **not** commit secrets, tokens, or API keys here. MCP server configs that reference secrets should use environment variable placeholders (e.g. `"${GITHUB_TOKEN}"`). The `.gitignore` at the repo root already excludes `.env` and `secrets/`.
