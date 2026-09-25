# 0003 — Run TypeScript directly on Node

- **Status:** Accepted
- **Date:** 2026-09-24
- **Refines:** [0001](0001-internal-packages-as-typescript-source.md)

## Context

The data tooling (`pnpm validate`, `pnpm schemas`) is TypeScript that runs from the command line. Node 24 can run `.ts` files directly by stripping their types, with no build step or extra runner (such as `tsx`). It only supports syntax that can be erased — no `enum`, no `namespace` — which the project already forbids (`erasableSyntaxOnly`). Node does not guess file extensions, so relative imports must name the `.ts` file.

## Decision

- Command-line scripts run with plain `node path/to/script.ts`.
- **Relative imports always include the `.ts` extension** (`import { x } from "./dates.ts"`), enabled by `allowImportingTsExtensions` in `tsconfig.base.json`. Vite and Vitest accept this too.
- The base config sets `"types": []`, so no package sees Node's globals by accident; packages that run on Node (`@paths/data`) opt in with `"types": ["node"]`. `@paths/shared` and `@paths/graph-core` stay platform-neutral, because the browser will use them too.

## Consequences

- ✅ No build step or extra dependency for scripts; what's in `src/` is what runs.
- ✅ ADR 0001's open question — how the API runs internal packages — may have the same answer in Phase 3 (plain Node), to be confirmed then.
- ❌ Every relative import must carry `.ts`. ESLint and `tsc` flag mistakes immediately, so this is cheap to keep.
