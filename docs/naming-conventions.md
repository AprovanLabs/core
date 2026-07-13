# Naming Conventions

Conventions for naming packages, apps, and infrastructure across AprovanLabs repos.

## Packages and apps

All published packages live under the `@aprovan/` npm scope (GitHub Packages) and are prefixed by their **project name** (`registry-`, `patchwork-`, …). Packages in the `core` repo drop the project prefix — core is the umbrella (`@aprovan/ui`, `@aprovan/node`, `@aprovan/devtools`).

Standard kind suffixes:

| Kind    | Meaning                                                                                   | Examples                                                   |
| ------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `infra` | Infrastructure (CDK apps, IaC)                                                            | `@aprovan/registry-infra`, `@aprovan/infra` (core)         |
| `ui`    | UI component library                                                                      | `@aprovan/registry-ui`, `@aprovan/ui` (core design system) |
| `app`   | API / backend service                                                                     | `@aprovan/registry-app` (the gateway)                      |
| `main`  | Shared resources that don't have another name (clients, contracts, shared config loaders) | `@aprovan/registry-main`, `@aprovan/node` (core)           |
| `web`   | Deployable web frontend (thin shell consuming a `ui` package)                             | `@aprovan/registry-web`, `@aprovan/patchwork-web`          |
| `glb`   | Globally-shared, cross-region resources (e.g. us-east-1 ACM certs, CloudFront-adjacent)   | `aprovan-glb` stack                                        |

Domain-specific packages may keep a descriptive name in place of a kind suffix when the kind suffixes don't fit (`@aprovan/patchwork-mcp`, `@aprovan/patchwork-compiler`), but still carry the project prefix.

## Infrastructure

- CDK stacks follow the same project + kind scheme via the shared `namer()` utility: `<project>-<kind>[-<qualifier>]`, environment- and region-suffixed.
- `glb` names the cross-region scope: any resource that must live in a specific region regardless of the deployment region (CloudFront certificates, etc.) goes in a `-glb` stack in `us-east-1`.
- Environments default to `prd`. Shared runtime config is published as a single SSM parameter per environment in dotenv format: `/aprovan/<env>/env` (see `@aprovan/node` loader).
