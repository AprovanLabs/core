# Ralph Tasks

Complete these tasks, using /Users/jsampson/Documents/JacobSampson/patchwork as the repo to validate the code scanning on

## Soul

Prefer to be concise and simple with your approach. Avoid duplicated code and re-implementing exiting functionality. Always be aware of where code _should_ go.

- DO keep code in separated areas where possible
- DO keep implementation simple and free of comments
- Do NOT keep backwards compatibility. Break legacy implementations where needed and remove deprecated code.
- Re-factor and re-organize as-needed, as you go.

Be generic in your implementation. Think think thoroughly through the abstractions you create and consider if there is a more powerful variant that preserves functionality without major sacrifices.

- ALWAYS use a strong sense of module isolation
- Do NOT plan one-off variants or implementations, unless absolutely necessary and properly isolated.
- ALWAYS consider how the implementation will work long-term and be extensible.
- ALWAYS check with the user if there are open questions, conflicts, or fundamental issues with the approach.

## Tasks

### inaday - Graph-Powered Codebase Refactoring

Build an incremental refactoring system using [graph-sitter](https://github.com/codegen-sh/graph-sitter) to scan codebases (including submodules), analyze relationships, and execute refactoring plans with human guidance.

**Spec:** [docs/specs/inaday.md](./docs/specs/inaday.md)

---

#### Phase 0: Project Setup

- [x] Initialize Python project structure with `uv`
- [x] Add graph-sitter as dependency (`uv add graph-sitter`)
- [x] Set up CLI skeleton with Click or Typer
- [x] Create `.inaday/` directory structure for knowledge files
- [x] Define `config.yaml` schema and parser
- [x] Add basic logging infrastructure

#### Phase 1: Scanning

- [x] Implement `Project` class to represent a scanned codebase
- [x] Add submodule discovery (parse `.gitmodules`, detect nested repos)
- [x] Integrate graph-sitter to parse files into code graph
- [x] Build cross-file dependency map (imports/exports)
- [x] Handle multi-language projects (Python, TypeScript, JavaScript)
- [x] Generate scan report as markdown knowledge file
- [x] Implement incremental scanning (only changed files)
- [x] CLI: `inaday scan [--include-submodules] [--languages]`

#### Phase 2: Analysis

**Dead Code Detection**

- [x] Identify functions with zero references
- [x] Identify classes with zero instantiations
- [x] Identify exports with zero external imports
- [x] Exclude test files and mocks from analysis
- [ ] Generate `dead-code.md` report

**Duplicate Detection**

- [x] Implement function signature similarity scoring
- [x] Detect near-duplicate implementations (configurable threshold)
- [x] Group duplicates by similarity clusters
- [ ] Generate `duplicates.md` report

**Boundary Violation Detection**

- [x] Define domain boundaries in config
- [x] Detect imports that cross boundary rules
- [x] Identify code that belongs in a different domain
- [ ] Generate `boundaries.md` report

**Additional Analyzers**

- [x] Circular dependency detection
- [x] Complexity hotspot detection (cyclomatic complexity)
- [ ] Orphan module detection
- [x] CLI: `inaday analyze [--analyzer ...]`

#### Phase 3: Proposal Generation

- [x] Define `Proposal` data model (type, affected files, risk, rationale)
- [x] Generate removal proposals from dead code findings
- [x] Generate consolidation proposals from duplicate findings
- [ ] Generate migration proposals from boundary violations
- [x] Implement risk scoring for proposals
- [x] Group proposals into logical batches
- [x] Generate proposal markdown files
- [ ] CLI: `inaday propose [--auto-approve-removals]`

#### Phase 4: Human Review

- [ ] Build interactive CLI review mode (`inaday review`)
- [ ] Display proposal details with affected file preview
- [ ] Support approve/reject/modify/skip actions
- [ ] Allow adding comments/context to proposals
- [ ] Support bulk approve/reject by category
- [ ] Track review decisions in knowledge files
- [ ] Support pausing and resuming review sessions

#### Phase 5: Execution

**Core Execution Engine**

- [ ] Implement checkpoint system (git stash/branch per batch)
- [ ] Use graph-sitter's edit API to apply changes
- [ ] Handle file renames and moves
- [ ] Update import statements after moves
- [ ] Support dry-run mode

**Verification Pipeline**

- [ ] Syntax validation (parse succeeds after edit)
- [ ] Import resolution check (no broken imports)
- [ ] Type checking integration (optional, for typed languages)
- [ ] Test suite runner (optional)
- [ ] Custom command hook support

**Execution Management**

- [ ] Batch execution with configurable size
- [ ] Automatic rollback on verification failure
- [ ] Generate execution log as markdown
- [ ] Support pause/resume execution
- [ ] CLI: `inaday execute [--dry-run] [--batch N]`

#### Phase 6: Knowledge File System

- [ ] Define markdown templates for all report types
- [ ] Implement scan report generator
- [ ] Implement analysis report generator
- [ ] Implement proposal report generator
- [ ] Implement execution log generator
- [ ] Add timestamps and versioning to reports
- [ ] Support linking between related reports

#### Phase 7: Integration

**Apprentice Integration**

- [ ] Index knowledge files for semantic search
- [ ] Log refactoring operations as events
- [ ] Enable querying historical decisions

**CLI Polish**

- [ ] `inaday init` - Initialize in a project
- [ ] `inaday status` - Show current state
- [ ] `inaday report` - View specific reports
- [ ] Add progress indicators and colors
- [ ] Add `--verbose` and `--quiet` flags
- [ ] Add `--help` with examples

#### Phase 8: Advanced Features

- [ ] Support custom analyzer plugins
- [ ] Add cross-repository refactoring (true monorepo)
- [ ] Implement scheduled analysis runs
- [ ] Add JSON/YAML output formats for CI integration
- [ ] Support `.inadayignore` file
- [ ] Add undo/redo for executed batches

---

#### Open Questions (Require Human Input)

- [ ] Should proposals be stored as structured YAML or narrative markdown?
- [ ] How to handle refactoring across submodule boundaries (ownership)?
- [ ] Should verification failures block the entire batch or just that operation?
- [ ] How deep should duplicate detection go (signature vs implementation)?
- [ ] Should we integrate with existing linters/formatters or stay independent?
