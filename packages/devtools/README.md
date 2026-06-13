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

Use [`devtools create-issues`](#devtools-create-issues) to parse the JSON output and create structured Multica issues for T1/T2 findings.

### `devtools create-issues`

Reads a desloppify scan JSON output file and creates Multica child issues for T1 (critical) and T2 (high) findings. Findings are grouped by detector within each package to keep related issues together.

```bash
devtools create-issues --input <path> [options]
```

**Options:**

| Flag | Description | Default |
|---|---|---|
| `--input <path>` | Path to desloppify scan JSON output file | *(required)* |
| `--parent <issue-id>` | Parent Multica issue UUID (e.g. APR-65 / Code Quality Sentinel) | — |
| `--project <project-id>` | Multica project UUID to assign issues to | — |
| `--max-tier <number>` | Maximum tier to include (`1` = T1 only, `2` = T1+T2) | `2` |
| `--dry-run` | Print what would be created without calling `multica` | `false` |

**Examples:**

```bash
# Preview what issues would be created
devtools create-issues --input desloppify-results.json --dry-run

# Create issues as children of APR-65 (Code Quality Sentinel)
devtools create-issues --input desloppify-results.json \
  --parent 0d0853e2-b0e0-45ce-a52e-d30066fe2d1d \
  --project 3fa22da9-5597-468e-87d9-089f96fdc7d8

# T1 (critical) only
devtools create-issues --input desloppify-results.json --max-tier 1
```

**Typical two-step workflow:**

```bash
# Step 1: scan
devtools desloppify --repo . --profile ci --output desloppify-results.json

# Step 2: create issues for T1/T2 findings
devtools create-issues --input desloppify-results.json \
  --parent <APR-65-uuid> --project <project-uuid>
```

### `devtools git-refresh`

Update git submodules and pull latest changes recursively.

### `devtools bootstrap`

Set up a repo with Cicadas, agent context, and symlinks.

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

## CI Integration

Wire desloppify into GitHub Actions with a score-threshold gate and optional Multica issue creation.

### Basic CI gate (fail on score regression)

```yaml
# .github/workflows/desloppify.yml
name: desloppify

on:
  push:
    branches: [main]
  pull_request:

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Run desloppify scan
        run: |
          pnpm exec devtools desloppify \
            --repo . \
            --profile ci \
            --output desloppify-results.json

      - name: Check score threshold
        run: |
          node -e "
            const r = JSON.parse(require('fs').readFileSync('desloppify-results.json','utf8'));
            const fail = r.packages.filter(p => p.score.objective < 70);
            if (fail.length) {
              console.error('Score below threshold in:', fail.map(p=>p.name).join(', '));
              process.exit(1);
            }
          "

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: desloppify-results
          path: desloppify-results.json
```

### With Multica issue creation on merge to main

Add a second job that runs only on `main` pushes to file Multica issues for any T1/T2 findings:

```yaml
      - name: Create Multica issues for T1/T2 findings
        if: github.event_name == 'push' && github.ref == 'refs/heads/main'
        env:
          MULTICA_TOKEN: ${{ secrets.MULTICA_TOKEN }}
        run: |
          pnpm exec devtools create-issues \
            --input desloppify-results.json \
            --parent ${{ vars.APR_65_UUID }} \
            --project ${{ vars.MULTICA_PROJECT_ID }}
```

> **Secrets / vars to configure:**
> - `MULTICA_TOKEN` — API token for `multica` CLI authentication
> - `APR_65_UUID` — UUID of the Code Quality Sentinel initiative (APR-65)
> - `MULTICA_PROJECT_ID` — UUID of the target Multica project

### Profile notes

| Profile | Description |
|---|---|
| `objective` | Default; scores against objective mechanical rules only |
| `ci` | Stricter thresholds; recommended for PR gates |
| `full` | All rules including subjective checks; best for periodic scans |
