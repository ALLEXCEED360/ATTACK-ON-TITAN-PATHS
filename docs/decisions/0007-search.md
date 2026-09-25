# 0007 — Search

- **Status:** Accepted
- **Date:** 2026-09-25

## Context

Readers need to find things the way they remember them: by any spelling ("Jaeger"), by a detail ("the boulder"), by association ("trost" should also surface the sealing of its gate), or by time ("shiganshina 850"). Search is also the easiest place to leak spoilers: a result that appears _because of_ something unrevealed is a spoiler, even if none of its text is hidden.

## Decision

**PostgreSQL only** (no separate search engine), in `search()` in `packages/db/src/queries.ts`.

- **Query parsing** (`parseQuery`): lower-case words, punctuation and stopwords removed. A standalone number is a **year**.
- **Every word must match** one of the following, and every one is filtered to the reader's cutoff:
  1. the entity's **names and spellings** (trigram similarity for typos, plus substring matching);
  2. one of its **revealed description paragraphs** (full-text, prefix matching);
  3. the name of an entity **connected by a revealed relationship** whose endpoints are both revealed.
- **A year** keeps only entities that exist in it, and only relationships active in it. So "carla 850" finds nothing, because Carla died in 845. A year on its own lists that year's events.
- **Ranking:** own-name matches score highest, then descriptions, then connections. Each result says _why_ it matched (`reason` plus `detail`), and the response echoes how the query was read (`terms`, `year`).
- **The palette** (Ctrl/⌘ + K) groups results by kind, orders the groups by their best result, and highlights the matched words. When the query is empty it shows recently opened entities and quick actions. Recent entries are stored as IDs only and shown only if they're visible at the current chapter, so lowering the chapter never reveals them.

## Consequences

- ✅ **The spoiler crawler now searches too.** At every reveal boundary it queries distinctive words from unrevealed text, and checks that every "connected to" result is really connected at that chapter.
- ✅ Nothing extra to host, sync or keep in step with the data.
- ❌ Connection matching can return many results for a common word. Ranking and the result limit keep this manageable at today's size; revisit when the full dataset lands.
