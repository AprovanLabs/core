# .multica/

Multica-platform-specific configuration for the AprovanLabs workspace.

## What Belongs Here

Only configuration that is specific to the Multica platform lives in this directory:
- **`squads/`** — Squad definitions (leader + member lists) for Multica's squad features
- **`autopilots/`** — Scheduled and webhook-triggered automation definitions

## What Does NOT Belong Here

Platform-agnostic config has been moved to canonical top-level locations:

| Config type | Canonical location | Notes |
|---|---|---|
| Agent definitions | `/agents/*.md` | Markdown + YAML frontmatter format |
| Agent defaults | `/agents/defaults.json` | Shared runtime and concurrency defaults |
| Skills | `/skills/` | One subdirectory per skill with `SKILL.md` |
| External skill imports | `/skills/imports.json` | Was `_imports.json` |
| MCP server config | `/mcp.json` | All servers; per-agent gating via `mcp:` frontmatter |

## Generated Directories

The following subdirectories are **generated** by `scripts/sync.sh` and should not be edited by hand:

- `.multica/agents/` — Generated from `/agents/*.md` by the sync script
- `.multica/mcp/` — Generated per-agent MCP configs from `/mcp.json` + agent frontmatter
- `.multica/skills/` — Populated from `/skills/` by the sync script

Run `scripts/sync.sh` to regenerate these from the canonical sources and push them to the Multica platform.

## `autopilots/`

One JSON file per autopilot. Each file defines a scheduled or webhook-triggered automation: its assigned agent, execution mode, task prompt (description), and trigger configuration. The sync script creates or updates these via `multica autopilot create/update` and `multica autopilot trigger-add/update`.

**Schema:** Each file has `title`, `description`, `agent` (name, resolved to ID at sync time), `mode` (`run_only` or `create_issue`), `priority`, `project` (null or project ID/name), `issue_title_template` (null or string with `{{date}}`), `status` (`active` or `paused`), and a `triggers` array. Each trigger has `kind` (`schedule` or `webhook`), and for schedule triggers: `cron`, `timezone`, `label`, and `enabled`.

**Webhook triggers:** When a webhook trigger is created, the platform generates a URL containing a signing secret. This URL is logged to stdout by the sync script and must be stored securely — it is never committed to this directory.

## Sync Workflow

```bash
# Preview what would change (no writes)
./scripts/sync.sh --dry-run

# Generate .multica/ artifacts only (no Multica API calls)
./scripts/sync.sh --generate-only

# Apply all changes to Multica
./scripts/sync.sh

# Apply and remove resources no longer in config
./scripts/sync.sh --prune
```

## Secrets

Do **not** commit secrets, tokens, or API keys here. MCP server configs that reference secrets use environment variable placeholders (e.g. `"${GITHUB_TOKEN}"`). The `.gitignore` at the repo root excludes `.env` and `secrets/`.
