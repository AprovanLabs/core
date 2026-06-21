# Apprentice

**Apprentice learns from you.** A personal knowledge base system that indexes and searches your command history (events) and files (assets). Provides MCP tools for LLMs to search, retrieve, execute, and log content.

## Overview

Apprentice is a monorepo containing:
- Core search and indexing engine
- MCP server for LLM integration
- CLI for manual interaction
- Shell integration for command logging

## Packages

| Package | Description |
|---------|-------------|
| `apprentice` | Core CLI, MCP server, indexer daemon |
| `verdani` | UI components (in progress) |

## Language/Framework

TypeScript/Node.js (monorepo with Turbo)

## Installation

```bash
cd repos/apprentice
pnpm install
pnpm build
```

## CLI Commands

### Search

```bash
# Search everything
apr search "kubernetes"

# Last 30 minutes only
apr search "git" --since 30m

# Filter by metadata
apr search "build" -f shell.exit_code=0

# Search events only
apr search "deploy" --scope events

# Search assets only
apr search "deploy" --scope assets

# JSON output
apr search "deploy" --json

# Markdown output for LLMs
apr search "error" --md
```

### Execute Assets

```bash
# Execute an asset by ID
apr run <asset-id> [args...]

# Execute by context:path
apr run scripts:deploy.sh
```

### Manage Contexts

```bash
# List registered contexts
apr context list

# Register a folder for indexing
apr context add <path>

# Disable a context
apr context disable <id>
```

### Indexer

```bash
# Run indexer manually
apr index

# Index specific context
apr index -c <context-id>
```

## MCP Server

The Apprentice MCP server exposes your personal knowledge base to LLMs via the Model Context Protocol.

### Setup with VS Code Copilot

Add to your VS Code `settings.json`:

```json
{
  "mcp.servers": {
    "apprentice": {
      "command": "node",
      "args": ["packages/apprentice/dist/mcp-server.js"],
    }
  }
}
```

### Available MCP Tools

| Tool | Description |
|------|-------------|
| `search` | Unified search across events and assets |
| `get_asset` | Retrieve a specific asset by ID |
| `run_asset` | Execute an executable asset (script) |
| `context_list` | List registered context folders |
| `context_add` | Register a folder for indexing |
| `log_event` | Record a custom event |

### Search Parameters

```typescript
{
  query: string,          // Keywords, command fragments, or natural language
  limit?: number,          // Max results (default: 20, max: 50)
  scope?: string,         // "events", "assets", or "both" (default: "both")
  filters?: object,       // Metadata filters with dot-notation
  since?: string,         // ISO 8601 timestamp - filter to items after this time
  related?: bool,         // Include related context for event results
  strategy?: object,     // Grouping strategy: { groupBy, orderBy?, direction? }
  windowSeconds?: number, // Temporal window for fallback (default: 60)
  relatedLimit?: number   // Max related events per result (default: 20)
}
```

### Version Filters (for Git-tracked contexts)

```typescript
{
  filters: {
    "version.ref": "<sha>",        // Content at specific commit
    "version.branch": "<name>",    // Latest content on branch
    "version.before": "<iso>",     // Content before timestamp
    "version.history": "true"      // Search across all historical versions
  }
}
```

### Programmatic Usage

```typescript
import { Apprentice } from "@apprentice/core";

const apprentice = new Apprentice({
  root: process.cwd(),
});

await apprentice.index();
const results = await apprentice.search("deploy");
```

## Development

```bash
# Watch mode for development
pnpm dev

# Run indexer manually
pnpm indexer

# Start MCP server
pnpm mcp

# Start daemon
pnpm daemon
```

## Best Practices

1. **Search before assuming** - Check if there's existing context for the task
2. **Let events reveal intent** - Prior chat/command history often clarifies ambiguous requests
3. **Default to scope: "both"** - Catches cross-type context
4. **Leverage filters** - Use `shell.exit_code`, `asset.extension`, etc. for precision
5. **Log your actions** - Use `log_event` to record AI interactions

## Dependencies

- Uses `turbo` for monorepo orchestration
- LibSQL for data storage
- MCP SDK for Model Context Protocol

## Related Repos

- [hardcopy](./hardcopy.md) - Hardcopy can link to Apprentice context via A2A provider
- [patchwork](./patchwork.md) - May use Apprentice for searching project context
