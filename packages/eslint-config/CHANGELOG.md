# @aprovan/eslint-config

## 2.0.0

### Major Changes

- [#26](https://github.com/AprovanLabs/core/pull/26) [`b326568`](https://github.com/AprovanLabs/core/commit/b326568828f4f24f1aecd9cbb74697e83308a7bb) Thanks [@JacobSampson](https://github.com/JacobSampson)! - Migrate from legacy ESLint 8 config format to ESLint 9 flat config.

  Breaking changes:

  - Package type changed from `commonjs` to `module`
  - Config exports are now flat config arrays (ESLint 9 format) instead of legacy objects
  - Removed `prettier` export (Prettier will have its own shared config)
  - Replaced `eslint-plugin-import` with `eslint-plugin-import-x` for flat config support
  - ESLint peer dependency bumped to `^9.0.0`
  - `@typescript-eslint/*` packages replaced with `typescript-eslint` meta-package

  Consumers must update their ESLint config from `.eslintrc.*` to `eslint.config.mjs` and use flat config array imports.
