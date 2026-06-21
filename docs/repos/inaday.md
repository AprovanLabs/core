# inaday

**"Re-building Rome"** - Graph-powered codebase analysis and incremental refactoring with human-in-the-loop guidance.

## Overview

inaday scans codebases (including submodules) using [graph-sitter](https://github.com/codegen-sh/graph-sitter) to build a comprehensive code graph, then analyzes relationships to identify dead code, duplicates, and boundary violations. It generates refactoring proposals that can be reviewed and executed incrementally with verification at each step.

## Language/Framework

Python (uses graph-sitter)

## Spec

See [specs/inaday.md](./specs/inaday.md) for the full technical specification.

## Quick Start

```bash
# Install
curl -LsSf https://astral.sh/uv/install.sh | sh
uv tool install graph-sitter --python 3.13

# Initialize
gs init
inaday init

# Scan and analyze
inaday scan --include-submodules
inaday analyze
inaday propose
inaday review
inaday execute --batch 5
```

## Key Features

- **Dead code detection** - Find unreferenced functions, classes, and exports
- **Duplicate detection** - Identify similar implementations for consolidation
- **Boundary analysis** - Detect code outside its domain boundary
- **Human-in-the-loop** - Review and approve proposals before execution
- **Incremental execution** - Small batches with checkpoints and rollback
- **Knowledge files** - Markdown reports for all operations

## Related

- [apprentice](./apprentice.md) - Index knowledge files for semantic search
- [hardcopy](./hardcopy.md) - Sync proposals to GitHub issues
