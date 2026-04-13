# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Fragment is a modular Discord bot framework built as a Bun monorepo. It consists of a Fastify REST/WebSocket backend (`server`), a Discord bot orchestrator (`core`), and a plugin system that allows hot-reloading of Discord bot functionality as separate processes.

## Monorepo Structure

```
server/         - Fastify HTTP + Socket.io backend
core/           - Discord bot orchestrator (spawns plugins, manages lifecycle)
packages/
  build/        - esbuild/Bun bundling utilities
  cli/          - CLI command utilities
  crypt/        - Encryption (crypto-js, password hashing)
  discord/      - discord.js wrapper (commands, events, crons, components)
  env/          - Type-safe .env loader
  lang/         - i18n (pt-BR, en)
  rpc/          - Axios-based HTTP client for inter-service communication
  socket/       - Socket.io client for plugin↔core IPC
  storage/      - Encrypted file storage (node-forge, mime-types)
  utils/        - Shared utilities
  worker/       - Plugin loader, file watcher, WebSocket server, versioning
plugins/
  base/         - Base plugin template
  tickets/      - Ticket management plugin
```

## Commands

### Development
```sh
bun run dev          # Start everything (watches files, restarts on changes)
```

### Per-workspace development
```sh
cd server && bun run dev     # Fastify server with debugger on ws://localhost:6499
cd core && bun run dev       # Core orchestrator with breakpoint debugging
```

### Build
```sh
bun run build        # Production release (binaries + signed artifacts)
```

### Linting
```sh
bun lint             # ESLint across all workspaces
cd server && bun run lint
cd core && bun run lint --fix
```

### Database (server workspace)
```sh
cd server
bun run migration:generate   # Generate migration from entity changes
bun run migration:run        # Apply pending migrations
bun run migration:revert     # Revert last migration
bun run schema:sync          # Direct schema sync (dev only)
bun run schema:drop          # Drop all tables
```

### Database setup (MariaDB)
```sh
mysql -u root -p
# Then:
CREATE USER 'fragment'@'%' IDENTIFIED BY 'password';
GRANT ALL PRIVILEGES ON *.* TO 'fragment'@'%' WITH GRANT OPTION;
FLUSH PRIVILEGES;
```

## Architecture

### Server (`/server`)
- **Entry**: `src/app.ts` — initializes DB, configures Fastify, auto-discovers and registers routers
- **Routing**: `Router` class (`src/controllers/router.ts`) — type-safe generic with `Authenticate`, `Schema`, `Query`, and `Methods` generics. Routes are discovered by glob from `src/routers/**/*.ts` and must use `export default` with a `Router` instance
- **Auth strategies**: `BearerStrategy` (JWT) and `CookiesStrategy`, both extend `Base`. The Socket.io upgrade is also gated by `BearerStrategy`
- **Database**: TypeORM with MySQL or SQL.js backends. Entities live in `src/database/entity/`. The `dataSource.ts` configures the connection

### Core (`/core`)
- **Entry**: `src/app.ts` — license/auth check, starts a Socket.io WebSocket server on an auto-generated port, then starts the plugin watcher
- **Plugin lifecycle**: `Plugin` and `Watcher` classes from the `worker` package handle loading, unloading, and hot-reloading plugins as child processes

### Plugin System
- Plugins are TypeScript files compiled to JS bundles by the `build` package
- Each plugin connects back to core via Socket.io (the `socket` package) for IPC
- Plugins can register Discord commands, handle events, define TypeORM entities, and expose CLI commands

### Discord package (`packages/discord`)
- Wraps discord.js with typed `Client`, `Commands`, `Components`, `Event`, `Crons`, and `Config` controllers
- `CustomInteraction` and `CustomResponse` extend discord.js interaction types

### IPC Pattern
- Core runs a Socket.io **server**; plugins run Socket.io **clients** (via `packages/socket`)
- The `rpc` package provides HTTP clients for plugin→server communication
- `packages/worker/src/controllers/Websocket.ts` manages the core-side WebSocket server

### Build Pipeline
- `devlop.ts` — chokidar watcher that rebuilds and restarts `server` and `core` in the right order using `concurrently`
- `release.ts` — production build: compiles plugins, bundles packages, creates signed binaries with RSA metadata
- `build.ts` — `PluginBuilder` class wrapping esbuild/Bun bundler used by individual workspaces

## Key Conventions

- **Workspaces** reference each other via `workspace:../packages/X` in `package.json`
- **Shared zod version** is pinned in the root catalog (`"zod": "^3.24.2"`)
- **Module system**: all packages use `"type": "module"` (ESM)
- **TypeScript**: strict mode, ESNext target, `bundler` module resolution, `reflect-metadata` required for TypeORM decorators
- **Path alias**: `core` uses `@/*` → `src/*`; server uses `@/` → `src/`
- **Localization**: use the `lang` package; locale files live in `locales/{lang}/`
- **Debugger**: VS Code launch config in `.vscode/launch.json` connects to Bun's WebSocket debugger on port 6499
