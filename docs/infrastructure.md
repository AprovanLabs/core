---
description: AprovanLabs infrastructure reference — CDK stacks, environments, shared config, and the naming conventions for packages, apps, and cloud resources (`<app>-<env>-<region-short-code>-<resource-name>`).
---

# Infrastructure

How AprovanLabs provisions and names infrastructure: the naming conventions for packages, apps, and cloud resources, the CDK stack layout, and shared runtime configuration.

## Naming Conventions

Conventions for naming packages, apps, and infrastructure across AprovanLabs repos.

Reference: [colinvh's AWS naming gist](https://gist.github.com/colinvh/14e4b7fb6b66c29f79d3?permalink_comment_id=3610147#gistcomment-3610147).

### Packages and apps

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

### Cloud resources

Resources are named with the pattern:

```
<app>-<env>-<region-short-code>-<resource-name>
```

- **Application**: `aprovan`, `lahilo`
- **Environment**: `dev`, `tst`, `stg`, `prd`, `glb`
- **Region code**: `use1`, `use2`, `glb`

CDK stacks follow the same scheme via the shared `namer()` utility in `@aprovan/cdk`: a bare `regional()` / `global()` call defaults the resource name to `main`, and environments default to `prd`.

`glb` names the cross-region scope: any resource that must live in a specific region regardless of the deployment region (CloudFront certificates, etc.) goes in a `-glb` stack in `us-east-1`.

#### AWS

Do not include the AWS service name in the resource name.

#### Secrets

Secrets use `/` instead of `-`:

```
<service>/<env>/<region-short-code>/<resource-name>
```

## Stacks

- `aprovan-prd-use2-main`: Shared Aprovan infra
- `docs-prd-use2-domain`: docs.aprovan.com
- `aprovan-glb-billing`: Aprovan billing
- `aprovan-prd-use2-core`: Shared Aprovan resources

### Legacy Stacks

- `Core-Domain`: `aprovan.com` public certificate
- `Client-Production`: Aprovan website
- `Client-Production-Domain`: Domain registration for `aprovan.com`
- `Docs-Production-Domain`: Domain registration for `docs.aprovan.com`
- `Lotus-Production-Domain`: Domain registration for `lotus.aprovan.com`
- `Lahilo-Production-Domain`: Domain registration for `lahilo.aprovan.com`
- `Extron-Production-Domain`: Domain registration for `extron.aprovan.com`
- `Lahilo-Production`: Lahilo

## Shared configuration

Shared runtime config is published as a single SSM parameter per environment in dotenv format: `/aprovan/<env>/env` (see the `@aprovan/node` loader).
