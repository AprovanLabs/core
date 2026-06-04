# Code Quality Knowledge Base

This directory contains articles produced by the Sentinel code quality scanner and manual reviews. Each article documents an anti-pattern, best practice, or shared config usage guide for the AprovanLabs monorepo.

## Categories

### Anti-patterns

Documented anti-patterns with file references and fix examples.

| Article | Severity | Affected Files | Added |
|---------|----------|---------------|-------|
| [Duplicated tsconfig without shared base](anti-patterns/duplicated-tsconfig.md) | Medium | `packages/devtools/tsconfig.json` | 2026-06-04 |

### Best Practices

Guides with code snippets showing recommended patterns.

| Article | Severity | Affected Files | Added |
|---------|----------|---------------|-------|
| *(none yet)* | | | |

### Shared Config Guides

How to use shared configurations (`@aprovan/tsconfig`, `eslint-config`, etc.).

| Article | Affected Packages | Added |
|---------|-------------------|-------|
| *(none yet)* | | |

### Scan Reports

Daily scan summaries produced by the Sentinel.

| Report | Date |
|--------|------|
| *(none yet)* | |

---

## Scanner ↔ Doc Cross-Referencing Convention

Scanner rules and documentation articles form a bidirectional link. Every scanner rule should trace back to a documented standard, and every documented pattern should reference its enforcing rule(s).

### In scanner rule definitions (YAML)

Add a `reference` field pointing to the source doc:

```yaml
- id: no-explicit-any
  description: Disallow use of `any`; use `unknown` and narrow with type guards
  severity: warning
  reference: docs/tech-stack.md#typescript
```

Add a `doc_article` field when the rule enforces a specific code-quality article:

```yaml
- id: tsconfig-extends-base
  description: tsconfig.json must extend a shared base config
  severity: medium
  reference: docs/tech-stack.md#typescript
  doc_article: docs/code-quality/anti-patterns/duplicated-tsconfig.md
```

### In doc articles (Markdown)

Add a **Scanner Enforcement** section at the end of each article (before References) listing which rules enforce the pattern:

```markdown
## Scanner Enforcement

| Rule ID | Severity | Tool |
|---------|----------|------|
| `tsconfig-extends-base` | medium | sentinel |
| `@typescript-eslint/strict` | error | eslint |

*If no scanner rule enforces this pattern yet, note:*
**Scanner enforcement:** Not yet implemented — candidate for rule `<proposed-id>`.
```

### In `docs/tech-stack.md` and other convention docs

When a convention is enforced by a scanner rule or ESLint config, add an inline note:

```markdown
- `strict: true` in all tsconfig files *(enforced: `tsconfig-strict-mode`)*
- No `any` — use `unknown` and narrow *(enforced: `@typescript-eslint/no-explicit-any`)*
```

### Naming conventions for rule IDs

- Use lowercase kebab-case: `tsconfig-extends-base`, `no-explicit-any`
- Prefix with tool namespace where applicable: `@typescript-eslint/...` for ESLint rules
- Sentinel-specific rules use no prefix: `tsconfig-extends-base`, `no-duplicated-deps`

## Scan Findings Feedback Process

When a scanner surfaces a pattern not yet documented:

1. **Scanner creates an issue** tagged with the finding (including file paths, severity, and a code snippet)
2. **Architect or Engineer reviews** and determines if the pattern warrants documentation
3. **If yes:** Author a new article in `docs/code-quality/anti-patterns/` or `best-practices/` using the Article Template below
4. **Author a scanner rule** for the pattern (or update an existing ESLint rule)
5. **Link bidirectionally:** The rule's `doc_article` field points to the article; the article's Scanner Enforcement section lists the rule
6. **Update this README** to add the new article to the category table above

When a documented pattern is found to be outdated or wrong:

1. Update the doc article in the same PR that changes the convention
2. Update or remove the corresponding scanner rule
3. Note the change in the PR description

## Cross-Repo Doc Awareness

Scanner rules in `core` apply to all repos in the workspace. Technical docs live centrally in `core/docs/`. Other repos (patchwork, apprentice, zolvery, etc.) do not maintain separate `docs/` directories — they inherit conventions from core.

- **Repo-specific overrides:** If a repo needs to deviate from a core convention, document the override in that repo's `README.md` and add an exception to the scanner rule definition
- **Shared configs:** ESLint, TypeScript, and Prettier configs in `core/packages/eslint-config` and `core/packages/tsconfig` are the enforcement layer for linting rules — these apply across repos via workspace dependency

---

## Article Template

Every quality article must follow this structure. Copy the template below when creating a new article.

```markdown
---
title: <short imperative title>
severity: low | medium | high | critical
affected_repos:
  - core
affected_files:
  - path/to/file.ts
created: YYYY-MM-DD
updated: YYYY-MM-DD
---

# <Title>

## Problem

<Describe the anti-pattern or gap. Include a code example showing the problem.>

\`\`\`ts
// ❌ Problem example
\`\`\`

## Recommended Fix

<Describe the fix. Include a code example showing the corrected approach.>

\`\`\`ts
// ✅ Fixed example
\`\`\`

## Impact

<Explain what happens if this is left unfixed — maintenance burden, bugs, etc.>

## Scanner Enforcement

| Rule ID | Severity | Tool |
|---------|----------|------|
| `<rule-id>` | <severity> | sentinel / eslint |

*If no scanner rule enforces this pattern yet, note:*
**Scanner enforcement:** Not yet implemented — candidate for rule `<proposed-id>`.

## References

- <Link to related issues, PRs, or external docs>
```
