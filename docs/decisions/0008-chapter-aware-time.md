# 0008 — Time is computed per reader chapter

- **Status:** Accepted
- **Date:** 2026-09-25

## Context

The time slider (Phase 6) hides whatever doesn't exist at the chosen moment. Lifetimes and relationship periods were resolved once, with full knowledge, when the data was seeded. That leaked spoilers through **absence**. For example, a reader at chapter 1 who scrubbed to 846 would see Carla vanish, which reveals a death shown in chapter 2. Text-based spoiler checks can't catch this, because no hidden text is ever sent.

## Decision

- Every lifetime bound keeps the chapter that reveals it (`startRevealedIn` / `endRevealedIn` in graph-core; `life_start_revealed_in` / `life_end_revealed_in` in Postgres).
- Each edge stores only its **own** period (`from`/`until`, or the moment of a killing). How long it's _active_ is computed when it's needed: the own period, clipped to both endpoints' lifetimes **as known at the reader's chapter**. In graph-core that's `lifetimeAt` / `activeAt`; in SQL it's `readerLives` / `readerEdges` in `queries.ts`.
- `viewGraph` passes on nodes with their lifetimes already masked to the chapter, so anything built on a reader's view (PATHS mode included) cannot use a hidden date.
- The full-knowledge `active_*` columns are removed (migration 0003).

## Consequences

- ✅ **Tested at three levels:**
  - graph-core unit tests;
  - SQL-vs-graph-core agreement at a leaking chapter/moment pair;
  - an API crawler check that, at every reveal boundary, scrubs past each still-hidden death and requires the character to still be present.

  Temporarily reintroducing the bug makes that crawler check fail at every chapter.

- ✅ Year-aware search uses the same rule, so "carla 846" finds Carla at chapter 1 but not at chapter 2.
- ❌ Edge activity is computed per request rather than read from a column. That's trivial at the current size, and the SQL still filters with indexes.
