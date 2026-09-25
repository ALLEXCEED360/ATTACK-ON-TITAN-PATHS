# 0006 — Web app architecture

- **Status:** Accepted
- **Date:** 2026-09-24

## Context

PATHS needs a browser app over the API: the "where are you in the story?" question, entity pages, a timeline, search, and a three-pane explorer that later gains the graph (Phase 5), the zoomable timeline (Phase 6) and PATHS mode (Phase 8).

## Decision

`apps/web`: **React 19 + Vite 8 + TypeScript**, styled with **Tailwind CSS 4**.

- **Routing:** React Router 8 (data router). The selection, and later the moment in time and the mode, live **in the URL**, so any view can be shared: `/explore/:id?at=…`, `/entity/:id`, `/timeline?order=story`.
- **The spoiler cutoff never goes in a URL** (`model/spoilers.md` §1). It's stored in the browser with Zustand's `persist`. Stored values are validated on load, and a tampered value is discarded, which brings back the chapter question.
- **Nothing is shown before the chapter question is answered.** `<ChapterGate>` wraps the whole app. Picking by volume waits until `data/reference/volumes.yaml` exists.
- **Server state:** TanStack Query. **Every query key includes the cutoff**, so a cached answer for one chapter is never shown at another.
- **UI state:** Zustand, only for state that's neither server data nor in the URL (so far, only the cutoff).
- **Typed API calls:** the API's OpenAPI document is exported to `apps/web/src/api/openapi.json`, and `openapi-typescript` generates `schema.d.ts` from it. `openapi-fetch` then makes every request and response type-checked. `pnpm api:types` regenerates both, and a test fails if the committed document falls behind the API.
- **Bundle hygiene:** the web app imports only `@paths/shared/constants`, a dependency-free entry point, so Zod stays out of the browser bundle (it would add about 28 KB gzipped).
- **Hosting:** Vercel, as a static single-page app (`vercel.json` rewrites every path to `index.html`), with `VITE_API_URL` pointing at the API.

## Consequences

- ✅ An API change that breaks the web app fails `pnpm typecheck`, not production.
- ✅ Links can be shared without spoilers: the recipient answers the chapter question themselves.
- ❌ The generated files must be regenerated after API changes (`pnpm api:types`). A test enforces this.
- ❌ No server-side rendering. That's fine for an explorer app, and search engines see only the shell.
