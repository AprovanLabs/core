# Zolvery

**Games!** A free platform for playing community-built games at https://zolvery.com

## Overview

Zolvery is a game platform monorepo containing:
- Core game engine and logic
- Web client (React-based)
- Backend server
- Mobile app (React Native)
- Example games

## Packages

| Package | Description |
|---------|-------------|
| `@zolver/core` | All logic related to running clients and servers |
| `@zolvery/client` | Web client (React) |
| `@zolvery/server` | Backend server |
| `@zolvery/mobile` | Mobile app (React Native) |
| `@zolvery/examples` | Example projects |
| `@zolvery/images` | Pre-setup client execution environments |

## Language/Framework

TypeScript (monorepo with Turbo)

## Installation

```bash
cd repos/zolvery
pnpm install
pnpm turbo run build
```

## Development

```bash
# All services
pnpm dev

# API server only
pnpm dev:api

# Client and server
pnpm watch

# Mobile app
pnpm mobile:run

# With public exposure (via Tailscale)
pnpm dev:public
```

## Scripts

```bash
# Build
pnpm app:build         # Web client
pnpm core:build        # Core packages
pnpm mobile:build      # Mobile app

# Test
pnpm core:test
pnpm e2e:test

# Docs
pnpm docs:build
pnpm docs:serve

# Other
pnpm dev:stitchery    # Run stitchery dev server
```

## Programmatic Usage

### Core Package

```typescript
import { Game, Player, World } from "@zolver/core";

const game = new Game({
  id: "my-game",
  world: new World({ size: 100 }),
});

const player = game.addPlayer("player1");
game.start();
```

### Server

```typescript
import { createServer } from "@zolvery/server";

const server = createServer({
  port: 3000,
  games: ["my-game"],
});

server.start();
```

### Client

```typescript
import { Client } from "@zolvery/client";

const client = new Client({
  server: "ws://localhost:3000",
  gameId: "my-game",
});

client.connect();
```

## Dependencies

- Uses `turbo` for monorepo orchestration
- React for web client
- React Native for mobile
- loro-crdt for CRDT operations

## Related Repos

- [patchwork](./patchwork.md) - Used for generative UI in games
- [apprentice](./apprentice.md) - Can search game context
- [hardcopy](./hardcopy.md) - Can aggregate game knowledge
