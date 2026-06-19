# Patchwork

**Platform for building generative UI experiences.** A monorepo containing tools for creating AI-powered, generative user interfaces.

## Overview

Patchwork provides a complete platform for building generative UI experiences, including:
- Core platform runtime
- JSX compiler for generative components
- VS Code extension for development
- UI component libraries (shadcn, ink, vanilla)

## Packages

| Package | Description |
|---------|-------------|
| `@aprovan/patchwork` | Core platform and runtime |
| `@aprovan/patchwork-compiler` | JSX to ESM compiler for generative components |
| `@aprovan/patchwork-vscode` | VS Code extension |
| `@aprovan/patchwork-editor` | Editor core |
| `@aprovan/patchwork-bobbin` | State management |
| `@aprovan/patchwork-stitchery` | UI composition |
| `@aprovan/patchwork-utcp` | Universal TCP protocol |
| `@aprovan/patchwork-images/shadcn` | shadcn/ui components |
| `@aprovan/patchwork-images/ink` | Ink React components |
| `@aprovan/patchwork-images/vanilla` | Vanilla JS components |

## Language/Framework

TypeScript/Node.js (monorepo with Turbo)

## Installation

```bash
cd repos/patchwork
pnpm install
pnpm build
```

## VS Code Extension Quickstart

1. Build the VS Code extension package:
```sh
pnpm -F @aprovan/patchwork-vscode build
```

2. Open the repo in VS Code and run the extension:
   - Open the Run and Debug panel
   - Choose "Run Extension", then start debugging

3. (Optional) Configure Copilot proxy for AI edits:
   - Start the proxy: `npx @aprovan/copilot-proxy serve --port 3000`
   - In VS Code settings, set `patchwork.copilotProxyUrl` to `http://localhost:3000`

## Compiler Usage

```typescript
import { PatchworkCompiler } from "@aprovan/patchwork-compiler";

const compiler = new PatchworkCompiler({
  entry: "./src/app.tsx",
  output: "./dist",
});

await compiler.compile();
```

## Programmatic API

### Patchwork Core

```typescript
import { Patchwork } from "@aprovan/patchwork";

const app = new Patchwork({
  root: "./src",
  output: "./dist",
});

await app.compile();
app.serve({ port: 3000 });
```

### Stitchery (UI Composition)

```typescript
import { compose } from "@aprovan/patchwork-stitchery";

const ui = compose({
  components: [Header, Content, Footer],
  layout: "stack",
});
```

## Development

```bash
# Watch mode
pnpm dev

# Build all packages
pnpm build

# Type check
pnpm typecheck
```

## Dependencies

- Uses `turbo` for monorepo orchestration
- React for UI components
- MCP SDK for Model Context Protocol (via copilot-proxy)

## Related Repos

- [copilot-proxy](./copilot-proxy.md) - Proxy for AI-powered edits in VS Code
- [zolvery](./zolvery.md) - Uses Patchwork for game UI rendering
- [apprentice](./apprentice.md) - May use Patchwork for UI generation
