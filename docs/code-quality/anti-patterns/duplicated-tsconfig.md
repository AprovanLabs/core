---
title: Create shared tsconfig base to eliminate compiler option duplication
severity: medium
affected_repos:
  - core
affected_files:
  - packages/devtools/tsconfig.json
created: 2026-06-04
updated: 2026-06-04
---

# Duplicated tsconfig Without Shared Base

## Problem

Each package in the monorepo defines its own `tsconfig.json` from scratch, duplicating compiler options. When a new package is added, the options must be copied manually. If a project-wide setting changes (e.g., raising the `target` from `ES2022` to `ES2024`), every `tsconfig.json` must be updated independently — and any package that is missed silently stays on the old target.

```jsonc
// ❌ packages/devtools/tsconfig.json — standalone, nothing to extend
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}

// ❌ A future packages/new-lib/tsconfig.json would copy all of the above again
```

## Recommended Fix

Create a shared base tsconfig at `packages/tsconfig/base.json` (or a dedicated `@aprovan/tsconfig` package) that all packages extend. Package-specific tsconfig files only override what differs.

```jsonc
// ✅ packages/tsconfig/base.json — shared base
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "declaration": true,
    "composite": true
  },
  "exclude": ["node_modules", "dist"]
}

// ✅ packages/devtools/tsconfig.json — extends the base, only overrides what differs
{
  "extends": "@aprovan/tsconfig/base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

## Impact

- **Drift risk:** Each package independently tracks compiler options. A change to the monorepo's TypeScript policy requires editing N files instead of 1.
- **Onboarding friction:** New package authors must copy-paste options and may accidentally omit `strict: true` or `skipLibCheck`.
- **Inconsistent builds:** If one package lacks `declaration: true`, its types won't be available to dependents within the monorepo.

## References

- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)
- [pnpm workspace tsconfig conventions](https://pnpm.io/workspaces)
