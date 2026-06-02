# AprovanLabs Tech Stack

Preferred technologies, frameworks, and tools for the AprovanLabs engineering team.

## Languages

| Language | Use |
|---|---|
| TypeScript | All application code (frontend and backend) |
| Python | Data science, ML pipelines, analysis notebooks |
| Bash | Build scripts, automation, CI helpers |
| HCL (Terraform) | Infrastructure as code |
| SQL | Database queries, migrations |

**Default to TypeScript** for any new application code unless there is a clear reason to use another language.

## Frontend

| Technology | Purpose |
|---|---|
| React 18+ | UI framework |
| TypeScript | Type safety |
| Tailwind CSS | Styling |
| Vite | Build tool and dev server |
| Vitest + React Testing Library | Unit and integration tests |
| Playwright | E2E tests |
| TanStack Query | Server state management |
| React Router v6+ | Routing |

**Design system**: Use Tailwind utilities and the shared component library in `packages/ui` (if available). Avoid CSS-in-JS solutions.

## Backend

| Technology | Purpose |
|---|---|
| Node.js | Runtime |
| TypeScript | Language |
| Hono or Express | HTTP framework (check existing app before choosing) |
| Vitest | Tests |
| Zod | Schema validation and type inference |
| Drizzle ORM or Prisma | Database access (check existing app) |

**API style**: REST for external APIs; internal services can use typed RPC (tRPC if already used in the app).

## Infrastructure

| Technology | Purpose |
|---|---|
| AWS | Cloud provider |
| CloudFormation | Infrastructure as code (legacy stacks) |
| Terraform | Infrastructure as code (new stacks) |
| GitHub Actions | CI/CD |
| Docker / DevPod | Local development environments |
| Cloudflare | CDN, DNS, Zero Trust |

## Package Management

- **pnpm** with workspace support for the monorepo
- Always use `pnpm`, never `npm` or `yarn`
- New packages must be added to the correct workspace in `pnpm-workspace.yaml`

## Monorepo Structure

```
core/                   # This repo — infrastructure, shared config, devtools
├── apps/               # Application deployments
│   └── aprovan/        # CloudFormation templates for Aprovan stack
├── packages/           # Shared TypeScript packages (libraries, utilities)
├── infra/              # Infrastructure tooling and DevPod configs
├── docs/               # Shared engineering knowledge base (you are here)
└── .multica/           # Multica agent/skill/squad definitions
```

## Conventions

### TypeScript

- `strict: true` in all tsconfig files
- No `any` — use `unknown` and narrow with type guards
- Prefer explicit return types on exported functions
- Use `type` imports when importing only types: `import type { Foo } from '...'`

### Git

- Branch naming: `<type>/<short-description>` (e.g., `feat/add-auth`, `fix/login-redirect`, `docs/sdd-auth`)
- Agent branches: `agent/<agent-name>/<session-id>` (created automatically by `multica repo checkout`)
- Commit messages: imperative mood, present tense (`Add feature`, not `Added feature`)
- Squash merge PRs to keep main history clean

### Testing

- Unit tests co-located with source: `foo.test.ts` next to `foo.ts`
- Integration tests in `__tests__/` or `tests/` at the package root
- E2E tests in the app's `e2e/` directory
- All tests must pass before transitioning an issue to `in_review`

### Environment Variables

- Never commit secrets or tokens
- Use `.env.example` files to document required variables
- Access via `process.env.VAR_NAME` with Zod validation at startup
- MCP configs use `${VAR_NAME}` placeholder syntax

## Adding New Dependencies

Before adding a dependency:
1. Check if an existing package already provides the functionality
2. Check the package's maintenance status (recent commits, open issues, bundle size)
3. Prefer packages with TypeScript types built-in
4. Run `pnpm why <package>` to check if it's already a transitive dep
5. Avoid adding dependencies for trivial utilities (the standard library is often enough)
