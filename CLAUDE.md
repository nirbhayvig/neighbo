# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Neighbo is a full-stack web/mobile app using a Bun monorepo with three workspaces:
- `apps/web` — React frontend with Capacitor for native mobile
- `apps/api` — Hono.js backend API
- `packages/shared` — Shared Zod schemas and TypeScript types

## Commands

```bash
bun install              # Install all dependencies
bun run dev              # Start all workspaces in dev mode
bun run dev:web          # Web app only (port 5173)
bun run dev:api          # API only (port 3001, hot-reload)
bun run build            # Build all workspaces
bun run typecheck        # Type-check all workspaces
bunx biome check .       # Lint + format check
bunx biome check --write . # Auto-fix lint + format
```

## Architecture

**Authentication flow:** Google Sign-In via Firebase Auth (web uses `signInWithPopup`, native uses Capacitor Firebase plugin). The API verifies Firebase ID tokens via middleware (`apps/api/src/middleware/auth.ts`). The web client auto-injects Bearer tokens via the Hono RPC client (`apps/web/src/lib/api.ts`).

**API pattern:** Hono app exports its type (`AppType`) from `apps/api/src/app.ts`, which the web app imports for type-safe RPC calls via `hc<AppType>`. Vite dev proxy forwards `/api/*` to `localhost:3001`.

**Web routing:** TanStack Router with file-based routing in `apps/web/src/routes/`. The `_authenticated.tsx` layout guard redirects unauthenticated users. Route tree is auto-generated (`routeTree.gen.ts` — do not edit).

**State management:** Firebase Auth for user identity, TanStack React Query for server state.

**UI:** Tailwind CSS + shadcn/ui components (in `apps/web/src/components/ui/` — generated, not hand-edited). Uses `@` path alias for `apps/web/src/`.

## Code Style

Biome handles formatting and linting. Key settings:
- 2-space indent, 100 char line width, double quotes, no semicolons, trailing commas (ES5)
- `verbatimModuleSyntax` is enabled — use `import type` for type-only imports
- Biome ignores `src/components/ui/` and `src/routeTree.gen.ts`

## Vite Plugin Order

In `apps/web/vite.config.ts`, the TanStack Router plugin **must** come before the React plugin.
