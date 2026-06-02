# .multica/mcp/

MCP (Model Context Protocol) server configuration for AprovanLabs agents.

## Files

| File | Purpose |
|---|---|
| `_common.json` | Baseline servers available to all agents |
| `deep-researcher.json` | Additional servers for Deep Researcher (context7 for code search) |
| `frontend-dev.json` | Additional servers for Frontend Dev (Playwright for browser automation) |

## Profile System

Each agent's `mcp_profile` field in their `.multica/agents/<name>.json` points to the MCP profile they use. `null` means the agent gets the common servers only. A profile name (e.g., `"frontend-dev"`) means the common servers plus the overrides in `frontend-dev.json`.

Agent configs with `mcp_profile: null` get `_common.json` servers.
Agent configs with `mcp_profile: "frontend-dev"` get `_common.json` merged with `frontend-dev.json`.

## Adding a New Profile

1. Create `<agent-name>.json` in this directory.
2. Set `"extends": "_common"` and add only the additional servers.
3. Reference the profile in the agent's JSON: `"mcp_profile": "<agent-name>"`.
4. Run `sync.sh` to apply (once Multica CLI supports per-agent MCP config).

## Local Development

The `.mcp.json` at the repo root mirrors `_common.json` for local Claude Code / OpenCode compatibility. Local agents get the same tool set as their cloud-run counterparts.

## Secrets

Never commit literal tokens or API keys. All secret references must use `${ENV_VAR}` placeholders.
The `.gitignore` excludes `.env` and `secrets/` at the repo root.
