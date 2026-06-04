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

## References

- <Link to related issues, PRs, or external docs>
```
