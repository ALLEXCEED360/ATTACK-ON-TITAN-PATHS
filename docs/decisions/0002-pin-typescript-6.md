# 0002 — Pin TypeScript to 6.0.x

- **Status:** Accepted
- **Date:** 2026-09-24

## Context

`typescript@latest` is 7.0, the native (Go) compiler. Two tools PATHS depends on do not work with it yet:

- **typescript-eslint** (typed linting, Step 5) requires `typescript >=4.8.4 <6.1.0` — it needs the classic JavaScript compiler API, which 7.0 does not ship.
- **VS Code's `typescript.tsdk` setting** needs `lib/tsserver.js`, which the 7.0 package does not contain.

TypeScript 6.0 is the last JavaScript-based release and was designed to match 7.0's language behavior, so code written now will not need changes to move to 7.

## Decision

Pin `typescript` to `~6.0.3` (6.0.x patches only) at the workspace root.

## Consequences

- ✅ ESLint typed rules and the VS Code workspace TypeScript version both work.
- ❌ We miss 7.0's faster type-checking for now — irrelevant at this project's size.
- 🔁 **Revisit** when typescript-eslint's peer range includes 7.x: check with `pnpm view typescript-eslint peerDependencies`.
