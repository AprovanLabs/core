# Hardcopy

**Keep everything close at hand.** A knowledge management system with CRDT sync that aggregates data from multiple providers (GitHub, Git, A2A agents) into a local database with conflict resolution.

## Overview

Hardcopy is a local-first knowledge management system that:
- Syncs data from GitHub, Git repositories, and A2A agents
- Uses CRDT (Conflict-free Replicated Data Types) for conflict resolution
- Provides a SQLite database for querying aggregated knowledge
- Renders views to file trees for easy access

## Language/Framework

TypeScript/Node.js

## Installation

```bash
pnpm add @aprovan/hardcopy

# Local development
cd repos/hardcopy
pnpm install
pnpm build
```

## Quick Start

### Initialize

```bash
pnpm exec hardcopy init
```

This creates:
- `.hardcopy/` — database and CRDT storage
- `hardcopy.yaml` — source and view configuration

### Configuration

Create a `hardcopy.yaml` in your project root:

```yaml
sources:
  - name: github
    provider: github
    orgs: [AprovanLabs]

  - name: agents
    provider: a2a
    endpoint: http://localhost:8080
    links:
      - edge: a2a.TRACKS
        to: github.Issue
        match: "github:{{task.meta.github.repository}}#{{task.meta.github.issue_number}}"

  - name: git
    provider: git
    repositories:
      - path: ~/Projects/example

views:
  - path: issues
    query: |
      MATCH (i:github.Issue)
      WHERE i.attrs->>'state' = 'open'
      RETURN i
    render:
      - path: "{{attrs.number}}.github.issue.md"
        type: github.Issue
```

## CLI Commands

```bash
# Initialize hardcopy
pnpm hardcopy init

# Sync all sources (fetch remote data)
pnpm hardcopy sync

# Refresh a view (render to file tree)
pnpm hardcopy refresh <view>

# Show sync status
pnpm hardcopy status

# Push local changes to remotes
pnpm hardcopy push [file]
```

## Providers

### GitHub

Requires `GITHUB_TOKEN` environment variable:

```bash
export GITHUB_TOKEN=ghp_xxxxxxxxxxxx
```

Configuration options:
- `orgs` — fetch all repos from organizations
- `repos` — specific repos (e.g., `owner/repo`)

### Git

Discovers branches and worktrees from local repositories.

### A2A

Connects to an A2A-compatible agent endpoint for agent task linking.

## Conflict Resolution

Uses `diff3` for clean merges, with automatic LLM fallback for complex conflicts.

```bash
export OPENAI_BASE_URL=https://api.openai.com/v1
export OPENAI_API_KEY=sk-...
export OPENAI_MODEL=gpt-4o
```

## Programmatic API

```typescript
import { Hardcopy } from "@aprovan/hardcopy";

const hc = new Hardcopy({ root: process.cwd() });
await hc.initialize();

// Sync all sources
const stats = await hc.sync();
console.log(`Synced ${stats.nodes} nodes`);

// Query the database
const db = hc.getDatabase();
const issues = await db.queryNodes("github.Issue");

await hc.close();
```

## File Structure

```
project/
├── hardcopy.yaml
├── .hardcopy/
│   ├── db.sqlite      # LibSQL database (nodes + edges)
│   ├── crdt/          # Per-node CRDT snapshots
│   └── errors/        # Sync error reports
└── issues/            # View directory
    ├── .index
    ├── 42.github.issue.md
    └── 43.github.issue.md
```

## Dependencies

- LibSQL for database
- Loro CRDT for conflict resolution
- YAML for configuration

## Related Repos

- [apprentice](./apprentice.md) - Hardcopy can link to Apprentice context via A2A provider
- [zolvery](./zolvery.md) - Can use Hardcopy for knowledge aggregation
