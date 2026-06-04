# Scanner ↔ Documentation Integration

**Status:** Draft
**Author:** Architect
**Issue:** [APR-110](mention://issue/1dcd6590-9828-4f64-9932-85e0ae895cd6)
**Date:** 2026-06-04

## Problem Statement

Scanning rules and technical documentation exist as disconnected artifacts. Scanner decisions are not grounded in documented standards, and scan findings do not feed back into the knowledge base. This creates drift: docs describe conventions that nothing enforces, and scanners enforce patterns that nothing documents.

## Goals

- Map every scannable convention from `core/docs/` to a current or proposed scanner rule
- Establish a bidirectional cross-referencing convention between rules and docs
- Define a feedback loop so new scan findings become documented patterns

## Inventory of Scannable Patterns

### From `docs/tech-stack.md`

| Convention | Section | Proposed Rule ID | Current Enforcement | Severity |
|-----------|---------|-----------------|-------------------|----------|
| `strict: true` in all tsconfig files | TypeScript | `tsconfig-strict-mode` | None (manual review) | high |
| No `any` — use `unknown` + type guards | TypeScript | `no-explicit-any` | ESLint `@typescript-eslint/no-explicit-any` (warn) | warning |
| Explicit return types on exported functions | TypeScript | `exported-fn-return-type` | None | medium |
| Use `type` imports for type-only imports | TypeScript | `consistent-type-imports` | ESLint `@typescript-eslint/consistent-type-imports` (error) | error |
| Always use `pnpm`, never `npm` or `yarn` | Package Management | `pnpm-only` | None | high |
| New packages in correct workspace in `pnpm-workspace.yaml` | Package Management | `workspace-membership` | None | medium |
| Branch naming: `<type>/<short-description>` | Git | `branch-naming` | None (CI check candidate) | low |
| Commit messages: imperative mood, present tense | Git | `commit-message-format` | None (CI check candidate) | low |
| Unit tests co-located: `foo.test.ts` next to `foo.ts` | Testing | `colocated-tests` | None | low |
| Never commit secrets or tokens | Environment Variables | `no-committed-secrets` | None (`.gitignore` + manual) | critical |
| Use `.env.example` to document required vars | Environment Variables | `env-example-exists` | None | medium |
| Validate env vars with Zod at startup | Environment Variables | `zod-env-validation` | None | medium |
| Avoid CSS-in-JS solutions | Frontend | `no-css-in-js` | None | low |
| Check existing deps before adding new ones | Dependencies | `dep-review` | Manual review only | low |

### From `docs/code-quality/anti-patterns/`

| Anti-Pattern Article | Proposed Rule ID | Current Enforcement | Severity |
|---------------------|-----------------|-------------------|----------|
| `duplicated-tsconfig.md` — tsconfig without shared base | `tsconfig-extends-base` | None | medium |

### From `docs/workflow.md`

| Convention | Proposed Rule ID | Current Enforcement | Severity |
|-----------|-----------------|-------------------|----------|
| All tests must pass before `in_review` | `ci-gate-tests` | CI pipeline (GitHub Actions) | high |
| No lint errors before `in_review` | `ci-gate-lint` | CI pipeline | high |
| No type errors before `in_review` | `ci-gate-typecheck` | CI pipeline | high |
| PR description explains what changed and why | `pr-description-required` | None (CI check candidate) | medium |

### From `docs/agent-config-refactor.md`

This is a design spec, not a convention doc. No scannable patterns — it describes a future state, not current rules to enforce.

### From ESLint shared config (`packages/eslint-config/base.js`)

Already-enforced rules that should be documented back into tech-stack or code-quality articles:

| ESLint Rule | Current Setting | Documented In |
|------------|----------------|---------------|
| `@typescript-eslint/no-explicit-any` | warn | `tech-stack.md` (TypeScript section) |
| `@typescript-eslint/consistent-type-imports` | error | `tech-stack.md` (TypeScript section) |
| `@typescript-eslint/no-unused-vars` | error | Not explicitly documented |
| `import/no-duplicates` | error | Not explicitly documented |
| `import/order` | error (alphabetized, grouped) | Not explicitly documented |

## Rule ↔ Doc Mapping Convention

Defined in `docs/code-quality/README.md` (updated as part of this task). Summary:

1. **Scanner rules** carry a `reference` field pointing to the source doc, and optionally a `doc_article` field pointing to a specific code-quality article
2. **Doc articles** include a "Scanner Enforcement" section listing enforcing rules
3. **Convention docs** (tech-stack, workflow) annotate inline which rules enforce each item
4. **Rule IDs** use lowercase kebab-case; ESLint rules keep their `@typescript-eslint/` namespace

## Scan Findings Feedback Loop

Defined in `docs/code-quality/README.md` (updated as part of this task). The process:

1. Scanner creates an issue with the finding
2. Architect/Engineer reviews and documents the pattern
3. A scanner rule is authored (or an ESLint rule is updated)
4. Bidirectional links are added
5. The code-quality README is updated with the new article

## Cross-Repo Awareness

- Technical docs are centralized in `core/docs/`. Other repos (patchwork, apprentice, zolvery, registry, projects, aprovan.com, data-science) do not have their own `docs/` directories.
- Scanner rules defined in `core` should apply across all repos via shared ESLint configs and workspace-level scanning.
- Repo-specific overrides are documented in each repo's `README.md` and configured as exceptions in rule definitions.
- Shared configs (`packages/eslint-config`, `packages/tsconfig`) are the primary enforcement layer for cross-repo consistency.

## Priority Recommendations

Rules to implement first, based on impact and feasibility:

1. **`tsconfig-strict-mode`** (high) — Verify all `tsconfig.json` files have `strict: true`. Simple file scan.
2. **`tsconfig-extends-base`** (medium) — Verify tsconfig files extend a shared base. Directly addresses the existing anti-pattern article.
3. **`no-explicit-any` escalation** (high) — Consider promoting from `warn` to `error` in ESLint config, aligning with the "No `any`" doc convention.
4. **`pnpm-only`** (high) — Check for `package-lock.json` or `yarn.lock` files. Simple file existence check.
5. **`no-committed-secrets`** (critical) — Scan for `.env` files, API keys, tokens in committed code.

## Open Questions

- [ ] **Scanner tool choice:** APR-67 is still evaluating AST tools (ts-morph, tree-sitter, knip, jscpd). The rule ID inventory above is tool-agnostic — rule definitions will depend on the chosen tool. (owner: whoever closes APR-67)
- [ ] **ESLint alignment:** Should conventions currently only documented (not enforced) be added as ESLint rules, Sentinel rules, or both? (owner: Architect)
- [ ] **CI vs. scanner:** Some rules (branch naming, commit messages, PR descriptions) fit better as CI checks than scanner rules. Clarify the boundary. (owner: Architect)

## References

- [APR-67](mention://issue/e22be292-5ab1-4f5b-8609-d9466913fc92) — AST tool investigation (parent issue)
- `docs/tech-stack.md` — primary tech stack conventions
- `docs/code-quality/README.md` — knowledge base structure, cross-referencing convention, feedback process
- `docs/workflow.md` — development workflow conventions
- `packages/eslint-config/base.js` — current ESLint enforcement
