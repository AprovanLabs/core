# AWS Cloudformation

## Naming Conventions

https://gist.github.com/colinvh/14e4b7fb6b66c29f79d3?permalink_comment_id=3610147#gistcomment-3610147

- Application: `aprovan`, `lahilo`
- Environment: `dev`, `tst`, `stg`, `prd`, `glb`
- Region Code: `use1`, `use2`, `glb`

`<app>-<env>-<region-short-code>-<resource-name>`

### AWS

Do not include the AWS name in the resource name

### Secrets

Secrets should use `/` instead of `-`. `<service>/<env>/<region-short-code>/<resource-name>`

## Stacks

### Legacy Stacks

- `Core-Domain`: `aprovan.com` public certificate
- `Client-Production`: Aprovan website
- `Client-Production-Domain`: Domain registration for `aprovan.com`
- `Docs-Production-Domain`: Domain registration for `docs.aprovan.com`
- `Lotus-Production-Domain`: Domain registration for `lotus.aprovan.com`
- `Lahilo-Production-Domain`: Domain registration for `lahilo.aprovan.com`
- `Extron-Production-Domain`: Domain registration for `extron.aprovan.com`
- `Lahilo-Production`: Lahilo

### Stacks

- `aprovan-glb-billing`: Aprovan billing
- `aprovan-prd-use2-core`: Shared Aprovan resources
