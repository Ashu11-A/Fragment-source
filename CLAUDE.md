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

<!-- rtk-instructions v2 -->
# RTK (Rust Token Killer) - Token-Optimized Commands

## Golden Rule

**Always prefix commands with `rtk`**. If RTK has a dedicated filter, it uses it. If not, it passes through unchanged. This means RTK is always safe to use.

**Important**: Even in command chains with `&&`, use `rtk`:
```bash
# ❌ Wrong
git add . && git commit -m "msg" && git push

# ✅ Correct
rtk git add . && rtk git commit -m "msg" && rtk git push
```

## RTK Commands by Workflow

### Build & Compile (80-90% savings)
```bash
rtk cargo build         # Cargo build output
rtk cargo check         # Cargo check output
rtk cargo clippy        # Clippy warnings grouped by file (80%)
rtk tsc                 # TypeScript errors grouped by file/code (83%)
rtk lint                # ESLint/Biome violations grouped (84%)
rtk prettier --check    # Files needing format only (70%)
rtk next build          # Next.js build with route metrics (87%)
```

### Test (60-99% savings)
```bash
rtk cargo test          # Cargo test failures only (90%)
rtk go test             # Go test failures only (90%)
rtk jest                # Jest failures only (99.5%)
rtk vitest              # Vitest failures only (99.5%)
rtk playwright test     # Playwright failures only (94%)
rtk pytest              # Python test failures only (90%)
rtk rake test           # Ruby test failures only (90%)
rtk rspec               # RSpec test failures only (60%)
rtk test <cmd>          # Generic test wrapper - failures only
```

### Git (59-80% savings)
```bash
rtk git status          # Compact status
rtk git log             # Compact log (works with all git flags)
rtk git diff            # Compact diff (80%)
rtk git show            # Compact show (80%)
rtk git add             # Ultra-compact confirmations (59%)
rtk git commit          # Ultra-compact confirmations (59%)
rtk git push            # Ultra-compact confirmations
rtk git pull            # Ultra-compact confirmations
rtk git branch          # Compact branch list
rtk git fetch           # Compact fetch
rtk git stash           # Compact stash
rtk git worktree        # Compact worktree
```

Note: Git passthrough works for ALL subcommands, even those not explicitly listed.

### GitHub (26-87% savings)
```bash
rtk gh pr view <num>    # Compact PR view (87%)
rtk gh pr checks        # Compact PR checks (79%)
rtk gh run list         # Compact workflow runs (82%)
rtk gh issue list       # Compact issue list (80%)
rtk gh api              # Compact API responses (26%)
```

### JavaScript/TypeScript Tooling (70-90% savings)
```bash
rtk pnpm list           # Compact dependency tree (70%)
rtk pnpm outdated       # Compact outdated packages (80%)
rtk pnpm install        # Compact install output (90%)
rtk npm run <script>    # Compact npm script output
rtk npx <cmd>           # Compact npx command output
rtk prisma              # Prisma without ASCII art (88%)
```

### Files & Search (60-75% savings)
```bash
rtk ls <path>           # Tree format, compact (65%)
rtk read <file>         # Code reading with filtering (60%)
rtk grep <pattern>      # Search grouped by file (75%)
rtk find <pattern>      # Find grouped by directory (70%)
```

### Analysis & Debug (70-90% savings)
```bash
rtk err <cmd>           # Filter errors only from any command
rtk log <file>          # Deduplicated logs with counts
rtk json <file>         # JSON structure without values
rtk deps                # Dependency overview
rtk env                 # Environment variables compact
rtk summary <cmd>       # Smart summary of command output
rtk diff                # Ultra-compact diffs
```

### Infrastructure (85% savings)
```bash
rtk docker ps           # Compact container list
rtk docker images       # Compact image list
rtk docker logs <c>     # Deduplicated logs
rtk kubectl get         # Compact resource list
rtk kubectl logs        # Deduplicated pod logs
```

### Network (65-70% savings)
```bash
rtk curl <url>          # Compact HTTP responses (70%)
rtk wget <url>          # Compact download output (65%)
```

### Meta Commands
```bash
rtk gain                # View token savings statistics
rtk gain --history      # View command history with savings
rtk discover            # Analyze Claude Code sessions for missed RTK usage
rtk proxy <cmd>         # Run command without filtering (for debugging)
rtk init                # Add RTK instructions to CLAUDE.md
rtk init --global       # Add RTK to ~/.claude/CLAUDE.md
```

## Token Savings Overview

| Category | Commands | Typical Savings |
|----------|----------|-----------------|
| Tests | vitest, playwright, cargo test | 90-99% |
| Build | next, tsc, lint, prettier | 70-87% |
| Git | status, log, diff, add, commit | 59-80% |
| GitHub | gh pr, gh run, gh issue | 26-87% |
| Package Managers | pnpm, npm, npx | 70-90% |
| Files | ls, read, grep, find | 60-75% |
| Infrastructure | docker, kubectl | 85% |
| Network | curl, wget | 65-70% |

Overall average: **60-90% token reduction** on common development operations.
<!-- /rtk-instructions -->