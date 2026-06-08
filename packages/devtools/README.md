# @aprovan/devtools

Shared development utilities for AprovanLabs projects.

## Commands

### `devtools desloppify`

Runs a [desloppify](https://desloppify.dev) scan against a repository and outputs normalized JSON artifacts for downstream consumption.

```bash
devtools desloppify --repo <path> [options]
```

**Options:**

| Flag | Description | Default |
|---|---|---|
| `--repo <path>` | Path to the repository root | *(required)* |
| `--packages <paths...>` | Relative package paths within the monorepo | auto-detected from `pnpm-workspace.yaml` |
| `--profile <profile>` | Scan profile: `objective`, `full`, or `ci` | `objective` |
| `--exclusions <patterns...>` | Additional exclusion patterns | — |
| `--output <path>` | Write JSON output to file | stdout |
| `--state-dir <path>` | Custom state directory | `<repo>/.desloppify` |
| `--no-auto-detect` | Disable monorepo package auto-detection | — |

**Output format:**

```json
{
  "repo": "my-repo",
  "profile": "objective",
  "timestamp": "2026-01-01T00:00:00.000Z",
  "packages": [
    {
      "name": "@myorg/pkg",
      "path": "packages/pkg",
      "score": { "overall": 82, "objective": 85, "strict": 74 },
      "issues": [
        {
          "tier": 2,
          "category": "missing-tests",
          "message": "No test file found for src/utils.ts",
          "file": "src/utils.ts",
          "line": null,
          "detector": "missing-tests",
          "id": "abc123",
          "status": "open",
          "confidence": "high"
        }
      ]
    }
  ]
}
```

**Examples:**

```bash
# Whole-repo scan, output to stdout
devtools desloppify --repo .

# Monorepo scan with explicit packages
devtools desloppify --repo . --packages packages/api packages/web

# Write JSON to file for downstream tooling
devtools desloppify --repo . --output desloppify-results.json

# CI profile (stricter thresholds)
devtools desloppify --repo . --profile ci --output desloppify-results.json
```

**Creating Multica issues from findings:**

Use the `desloppify-issues` skill (see `skills/desloppify-issues/`) to parse the JSON output and create structured Multica issues for T1/T2 findings.

### `devtools quality`

Run desloppify quality scans with shared defaults and consistent output.

**Subcommands:**

#### `devtools quality scan`

Scan a path for code quality issues.

```bash
devtools quality scan [--path <path>] [--profile ci|full|objective] [--package <name>] [--state <path>] [--json] [--no-badge]
```

| Flag | Description | Default |
|---|---|---|
| `--path <path>` | Path to scan | cwd |
| `--profile <profile>` | Scan profile: `ci`, `full`, or `objective` | `ci` |
| `--package <name>` | Scan a single package by name (monorepo) | — |
| `--state <path>` | State directory for isolation | — |
| `--json` | Output results as JSON only | — |
| `--no-badge` | Suppress badge output | — |

#### `devtools quality status`

Report quality status from desloppify state; exits non-zero if score is below threshold.

```bash
devtools quality status [--path <path>] [--state <path>] [--threshold <n>] [--json]
```

| Flag | Description | Default |
|---|---|---|
| `--path <path>` | Path to scan/repo | cwd |
| `--state <path>` | Path to desloppify state file or directory | — |
| `--threshold <n>` | Minimum overall score required | `70` |
| `--json` | Emit JSON only | — |

#### `devtools quality next`

List the next prioritized desloppify fix items as structured JSON.

```bash
devtools quality next [--path <path>] [--state <path>] [--count <n>] [--json]
```

| Flag | Description | Default |
|---|---|---|
| `--path <path>` | Path to scan/repo | cwd |
| `--state <path>` | Path to desloppify state file or directory | — |
| `--count <n>` | Number of items to return | `10` |
| `--json` | Emit JSON only | — |

### `devtools git-refresh`

Update git submodules and pull latest changes recursively.

### `devtools bootstrap`

Set up a repo with Cicadas, agent context, and symlinks.

## Development

```bash
pnpm build        # compile TypeScript via tsup
pnpm dev          # watch mode
pnpm test         # run vitest test suite
pnpm typecheck    # type-check without emitting
pnpm lint         # run ESLint
```

## Programmatic API

```typescript
import { runDesloppifyScan, DEFAULT_EXCLUSIONS } from "@aprovan/devtools";

const result = await runDesloppifyScan({
  repo: "/path/to/repo",
  profile: "objective",
  exclusions: DEFAULT_EXCLUSIONS,
});

console.log(result.packages[0].score);
```
