---
title: Eliminate unguarded JSON.parse calls across the codebase
severity: high
affected_repos:
  - core
  - registry
  - patchwork
  - zolvery
affected_files:
  - packages/devtools/src/desloppify/runner.ts
  - (registry: 6 occurrences across apps/packages)
  - (patchwork/mcp-app-server: 2 occurrences)
  - (zolvery: 5 occurrences)
created: 2026-06-07
updated: 2026-06-07
---

# Unguarded JSON.parse Without Error Handling

## Problem

`JSON.parse()` throws a `SyntaxError` on malformed input. When called without a try/catch, any malformed JSON — whether from user input, API responses, config files, or localStorage — causes an unhandled exception that crashes the process or breaks the UI.

This pattern was found in 4 of 5 AprovanLabs repos during the first Code Quality Sentinel scan (APR-75), making it the most prevalent security-adjacent finding across the organization.

```ts
// ❌ Unguarded — throws on malformed input
const config = JSON.parse(fs.readFileSync("config.json", "utf-8"));
const data = JSON.parse(response.body);
const stored = JSON.parse(localStorage.getItem("prefs"));
```

In registry, 3 hardcoded secrets were found adjacent to unguarded parse calls, compounding the risk: a parse failure in a secret-handling path could leak sensitive data in error messages.

## Recommended Fix

Wrap every `JSON.parse()` call in a try/catch. Return a typed fallback or throw a domain-specific error on failure.

```ts
// ✅ Safe parse with typed fallback
function safeParseJson<T>(input: string, fallback: T): T {
  try {
    return JSON.parse(input) as T;
  } catch {
    return fallback;
  }
}

// ✅ Safe parse with domain error
function parseConfig(raw: string): Config {
  try {
    return JSON.parse(raw);
  } catch (cause) {
    throw new ConfigError(`Invalid config JSON: ${(cause as Error).message}`, { cause });
  }
}

// ✅ For validated external input (API responses, user uploads)
function parseApiResponse(body: string): ApiResponse {
  try {
    const parsed = JSON.parse(body);
    return validateApiResponse(parsed);
  } catch (cause) {
    throw new ApiError("Malformed API response", { cause });
  }
}
```

For frequently-parsed shapes, create a shared utility in `@aprovan/devtools`:

```ts
// packages/devtools/src/json.ts
export function safeJsonParse<T>(
  input: string,
  validator: (data: unknown) => T,
): T | undefined {
  try {
    return validator(JSON.parse(input));
  } catch {
    return undefined;
  }
}
```

## Impact

- **Crash risk:** Any unguarded `JSON.parse` is a latent crash. If malformed input ever reaches it (corrupted config, network error, adversarial input), the application throws instead of degrading gracefully.
- **Security surface:** In registry, unguarded parse calls coexist with hardcoded secrets. A parse failure in a secret-handling path could expose credentials in stack traces or error logs.
- **Cross-repo consistency:** 4 of 5 repos have this pattern. Without a shared utility, each repo must independently remember to wrap parse calls — and the Sentinel scan proves they don't.

## Scanner Enforcement

**Scanner enforcement:** `security::json_parse_unguarded` (desloppify built-in detector). Active in all repos. Flags every `JSON.parse()` call not wrapped in a try/catch block.

## References

- [MDN: JSON.parse() — exceptions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse#exceptions)
- [APR-196](mention://issue/9afa635c-c328-4577-925e-96351f11a716) — Fix unguarded JSON.parse in core repo
- [APR-126](mention://issue/cf2bfe0b-a487-45d4-8fad-a6ac000b7eb2) — Fix unguarded JSON.parse in patchwork
- [APR-134](mention://issue/c9ac9de1-886d-482b-9092-106d5667a40c) — Fix security issues in registry
