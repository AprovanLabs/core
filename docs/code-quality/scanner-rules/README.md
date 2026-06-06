# Code Quality Scanner Rules

ast-grep rule definitions for the Code Scanner agent. Rules are organized by language.

## Structure

```
scanner-rules/
├── README.md
├── typescript/         # TypeScript and TSX rules
│   ├── no-console-log.yml
│   ├── no-empty-catch.yml
│   ├── exported-fn-no-return-type.yml
│   ├── no-tsconfig-strict-false.yml
│   └── no-bare-rethrow.yml
└── python/             # Python rules
    ├── no-bare-except.yml
    └── no-print-in-production.yml
```

## Running the Rules

```bash
# TypeScript rules against a repo
npx @ast-grep/napi scan --config docs/code-quality/scanner-rules <target-dir> --format json

# TypeScript rules only
npx @ast-grep/napi scan --config docs/code-quality/scanner-rules/typescript <target-dir> --format json

# Python rules only
npx @ast-grep/napi scan --config docs/code-quality/scanner-rules/python <target-dir> --format json
```

## Rule Design Principles

1. **No ESLint duplication.** ast-grep rules target structural patterns that ESLint cannot catch — cross-file concerns, architectural patterns, and custom matches. If ESLint already enforces a pattern, do not create an ast-grep rule for it.

2. **Cross-reference with docs.** Every rule should carry a `note` or `message` linking back to the documented convention (e.g., `docs/tech-stack.md#typescript`). Rules that enforce a specific anti-pattern article should include a `metadata` field with `doc_article`.

3. **Severity alignment.** Use ast-grep severity levels (`hint`, `info`, `warning`, `error`, `off`) aligned with the severity in `docs/scanner-doc-integration.md`.

4. **Fix where possible.** Provide a `fix` pattern when the correction is mechanical and safe. Do not provide auto-fixes for rules where human judgment is required.

## Adding New Rules

1. Create a YAML file in the appropriate language directory
2. Follow the ast-grep rule format (see [APR-108](mention://issue/2a478aba-2732-4858-bb61-2197c2a203d2) research for the complete field reference)
3. Test the rule against the target repo:
   ```bash
   npx @ast-grep/napi scan --rule <rule-file> <target-dir>
   ```
4. Add the rule ID to `docs/scanner-doc-integration.md` inventory
5. Add a Scanner Enforcement entry to the relevant code-quality article (if one exists)
6. Update this README's directory listing

## Existing Enforcement (ELint — do not duplicate)

These ESLint rules are already active in the monorepo. Do not create ast-grep equivalents:

| ESLint Rule | Setting | 
|-------------|---------|
| `@typescript-eslint/no-explicit-any` | warn |
| `@typescript-eslint/consistent-type-imports` | error |
| `@typescript-eslint/no-unused-vars` | error |
| `import/no-duplicates` | error |
| `import/order` | error |
