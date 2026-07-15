# @aprovan/ui

## 0.3.0

### Minor Changes

- [`8765479`](https://github.com/AprovanLabs/core/commit/8765479e76b6f413b4068cb86875b40bee240110) Thanks [@JacobSampson](https://github.com/JacobSampson)! - Add shared environment loading and the Aprovan design system.

- [`6472f91`](https://github.com/AprovanLabs/core/commit/6472f91470bade8cc88b0d5adb6f6a0c0502dfcd) Thanks [@JacobSampson](https://github.com/JacobSampson)! - Add shared Cognito auth (`@aprovan/ui/auth`) and gateway session/workspace
  (`@aprovan/ui/gateway`) submodules. Both expose a framework-agnostic core plus
  React bindings so the registry and patchwork web clients (and a future Capacitor
  mobile app) share one optional Cognito PKCE flow and gateway session client.

### Patch Changes

- [`d278f04`](https://github.com/AprovanLabs/core/commit/d278f045aeaa8ad4c3cdfa6ce3f9246591b864ca) Thanks [@JacobSampson](https://github.com/JacobSampson)! - Add `@aprovan/ui/shell`: shared top-bar session components (`WorkspaceSwitcher`, `UserMenu`, `SessionArea`) so registry and patchwork render the same professional workspace/profile UI over the shared auth + gateway session clients.
