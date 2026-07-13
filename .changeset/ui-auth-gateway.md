---
"@aprovan/ui": minor
---

Add shared Cognito auth (`@aprovan/ui/auth`) and gateway session/workspace
(`@aprovan/ui/gateway`) submodules. Both expose a framework-agnostic core plus
React bindings so the registry and patchwork web clients (and a future Capacitor
mobile app) share one optional Cognito PKCE flow and gateway session client.
