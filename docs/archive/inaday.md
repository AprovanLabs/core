# inaday - Incremental Codebase Refactoring System

**Graph-powered codebase analysis and incremental refactoring with human-in-the-loop guidance.**

## Overview

inaday is a system for scanning codebases (including those with submodules), analyzing relationships via graph-sitter, and incrementally refactoring code while preserving correctness. It provides a structured workflow for identifying issues, generating improvement hypotheses, and executing refactoring plans with human oversight.

## Core Dependencies

- [graph-sitter](https://github.com/codegen-sh/graph-sitter) - Python tool for parsing codebases into a navigable graph with edit capabilities

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         inaday Pipeline                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐      │
│  │  Scan    │───▶│ Analyze  │───▶│ Propose  │───▶│ Execute  │      │
│  │          │    │          │    │          │    │          │      │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘      │
│       │              │               │               │              │
│       ▼              ▼               ▼               ▼              │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐      │
│  │ Graph    │    │ Knowledge│    │ Human    │    │ Verify   │      │
│  │ Database │    │ Files    │    │ Review   │    │ & Commit │      │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Phases

### Phase 1: Scan

Recursively parse the codebase (and submodules) using graph-sitter to build a comprehensive code graph.

**Inputs:**
- Root directory path
- Submodule configuration
- Language/framework hints

**Outputs:**
- Code graph (functions, classes, modules, imports, exports)
- Cross-module dependency map
- Submodule boundary markers

### Phase 2: Analyze

Run analysis passes over the graph to identify issues and opportunities.

**Built-in Analyzers:**

| Analyzer | Description | Example Output |
|----------|-------------|----------------|
| `dead-code` | Functions/classes with no references or exports | `utils/helpers.py:parse_legacy()` - 0 refs |
| `duplicates` | Similar function signatures/implementations | `auth.validate()` ≈ `users.check_auth()` |
| `boundary-violations` | Code outside its domain boundary | `payments/` contains user management logic |
| `circular-deps` | Circular import chains | `A → B → C → A` |
| `orphan-exports` | Exports never imported elsewhere | `export const LEGACY_CONST` - 0 imports |
| `complexity-hotspots` | High cyclomatic complexity | `process_order()` - complexity: 47 |

**Outputs:**
- Issue manifest (categorized findings)
- Severity scores
- Suggested groupings

### Phase 3: Propose

Generate refactoring hypotheses and create actionable plans.

**Hypothesis Types:**

1. **Removal** - Dead code, orphan exports, legacy functions
2. **Consolidation** - Duplicate implementations → shared module
3. **Migration** - Move code across domain boundaries
4. **Extraction** - Break apart complexity hotspots
5. **Reorganization** - Restructure module hierarchy

**Human Checkpoints:**
- Review generated hypotheses
- Approve/reject/modify proposals
- Provide domain context for ambiguous cases
- Set priority ordering

**Outputs:**
- Refactoring plan (ordered operations)
- Risk assessment per operation
- Rollback markers

### Phase 4: Execute

Apply refactoring operations incrementally with verification.

**Execution Loop:**
```
for each operation in plan:
    1. Create checkpoint (git stash/branch)
    2. Apply graph-sitter edits
    3. Run verification suite
    4. If failed: rollback + flag for human review
    5. If passed: commit checkpoint
    6. Generate operation report
```

**Verification:**
- Syntax validation (parse succeeds)
- Type checking (if applicable)
- Import resolution (no broken imports)
- Test suite (if available)
- Custom validators (user-defined)

## Knowledge Files

inaday generates markdown knowledge files throughout the process:

```
.inaday/
├── scans/
│   └── 2024-03-02-initial.md      # Scan report
├── analysis/
│   ├── dead-code.md               # Dead code findings
│   ├── duplicates.md              # Duplicate analysis
│   └── boundaries.md              # Boundary violations
├── proposals/
│   ├── consolidate-auth.md        # Specific proposal
│   └── remove-legacy-utils.md
├── executions/
│   └── 2024-03-02-batch-1.md      # Execution log
└── config.yaml                     # Project configuration
```

## Configuration

```yaml
# .inaday/config.yaml
project:
  name: my-monorepo
  root: .
  submodules:
    - path: libs/shared
      boundary: shared-utils
    - path: services/api
      boundary: api-domain

analyzers:
  dead-code:
    enabled: true
    exclude:
      - "**/test/**"
      - "**/__mocks__/**"
  duplicates:
    enabled: true
    similarity_threshold: 0.85
  boundaries:
    enabled: true
    rules:
      - domain: payments
        allowed_imports: [shared, logging]
      - domain: users
        allowed_imports: [shared, logging, auth]

verification:
  syntax: true
  types: true  # requires type checker
  tests: false # run test suite
  custom:
    - name: lint
      command: pnpm lint --fix

execution:
  batch_size: 5
  require_approval: true
  auto_commit: false
```

## CLI Interface

```bash
# Initialize inaday in a project
gs init
inaday init

# Full scan of codebase
inaday scan [--include-submodules] [--languages py,ts,js]

# Run specific analyzers
inaday analyze [--analyzer dead-code,duplicates]

# Generate proposals from analysis
inaday propose [--auto-approve-removals]

# Execute approved proposals
inaday execute [--dry-run] [--batch 5]

# Interactive review mode
inaday review

# Status and reports
inaday status
inaday report [scan|analysis|execution]
```

## Python API

```python
from inaday import Project, Analyzer, Executor

# Initialize project
project = Project.from_directory("./my-repo")
project.scan(include_submodules=True)

# Run analysis
analyzer = Analyzer(project)
issues = analyzer.run([
    "dead-code",
    "duplicates",
    "boundary-violations"
])

# Generate proposals
proposals = analyzer.propose(issues)

# Human review hook
for proposal in proposals:
    if proposal.needs_review:
        decision = await human_review(proposal)
        proposal.apply_decision(decision)

# Execute with verification
executor = Executor(project)
results = executor.run(
    proposals,
    verify=True,
    checkpoint=True
)

# Generate reports
project.generate_knowledge_files()
```

## Integration Points

### With apprentice
- Index knowledge files for semantic search
- Log refactoring operations as events
- Query historical refactoring decisions

### With hardcopy
- Sync refactoring proposals to GitHub issues
- Track execution status across repos
- Link proposals to commits

### With patchwork
- Build interactive review UI
- Visualize code graph
- Stream execution progress

## Example Workflow

```
$ inaday scan --include-submodules
Scanning 3 repositories...
  ├── main-repo: 1,247 files, 45,892 nodes
  ├── libs/shared: 89 files, 3,201 nodes
  └── services/api: 312 files, 12,445 nodes
Graph built: 61,538 total nodes

$ inaday analyze
Running analyzers...
  ├── dead-code: 23 findings
  ├── duplicates: 7 findings
  └── boundary-violations: 4 findings
Analysis complete. Run `inaday propose` to generate refactoring plan.

$ inaday propose
Generated 34 proposals:
  ├── 23 removals (auto-approved)
  ├── 7 consolidations (review required)
  └── 4 migrations (review required)

$ inaday review
[1/11] Consolidate auth.validate() and users.check_auth()
  - Similarity: 92%
  - Suggested: Create shared/auth.ts with validate()
  - Affected files: 12
  
  [a]pprove  [r]eject  [m]odify  [s]kip  [?]help
  > a

$ inaday execute --batch 5
Executing batch 1/7...
  ✓ Remove utils/legacy.py:parse_v1()
  ✓ Remove utils/legacy.py:format_date_old()
  ✓ Remove services/api/deprecated.ts
  ✓ Consolidate auth validators → shared/auth.ts
  ✓ Update 12 import statements
Batch 1 complete. Continue? [y/n]
```

## Safety Guarantees

1. **No silent failures** - All operations logged and reported
2. **Checkpoint-based** - Every batch creates a rollback point
3. **Verification-first** - Code must pass checks before commit
4. **Human-in-the-loop** - Ambiguous cases always flagged for review
5. **Incremental** - Small batches reduce blast radius
6. **Auditable** - Full history in knowledge files

## Future Considerations

- LLM-assisted proposal generation (explain *why* code should change)
- Cross-repository refactoring for true monorepo support
- IDE integration for inline review
- Scheduled analysis runs (CI/CD integration)
- Custom analyzer plugin system
