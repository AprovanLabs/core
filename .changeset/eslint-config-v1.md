---
"@aprovan/eslint-config": major
---

Migrate from legacy ESLint 8 config format to ESLint 9 flat config.

Breaking changes:
- Package type changed from `commonjs` to `module`
- Config exports are now flat config arrays (ESLint 9 format) instead of legacy objects
- Removed `prettier` export (Prettier will have its own shared config)
- Replaced `eslint-plugin-import` with `eslint-plugin-import-x` for flat config support
- ESLint peer dependency bumped to `^9.0.0`
- `@typescript-eslint/*` packages replaced with `typescript-eslint` meta-package

Consumers must update their ESLint config from `.eslintrc.*` to `eslint.config.mjs` and use flat config array imports.
