# 0001 — Internal packages export TypeScript source

- **Status:** Accepted
- **Date:** 2026-09-24

## Context

PATHS is a pnpm monorepo with four projects — `apps/web`, `apps/api`, `packages/shared` and `packages/graph-core` — that share code. Each internal package needs a way to be imported by the others.

## Decision

Internal packages point their `exports` directly at TypeScript source (`"./src/index.ts"`). There is no per-package build step and no `dist/` folder. The consuming app's build tool (Vite for the web app, a bundler for the API) compiles them.

All packages extend one strict `tsconfig.base.json`. `tsc` only type-checks (`noEmit`); `pnpm typecheck` runs it across the workspace.

## Consequences

- ✅ No build step for internal packages; edits are picked up instantly.
- ✅ No stale `dist/` output to get out of sync with source.
- ❌ The packages cannot be published to npm as-is. Acceptable — they are private.
- ❌ The API cannot run the source with plain `node`; it will need a bundler or TS-aware runner (decided in Phase 3).
