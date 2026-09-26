# Docs

Design documents for PATHS. These are the rules the data and code must follow — when they disagree with the code, fix one of them.

**Suggested reading order:** canon → IDs → dates → spoilers → relationships → PATHS mode.

## Design

| Doc                                                | Purpose                                                   | Status |
| -------------------------------------------------- | --------------------------------------------------------- | ------ |
| [`canon-and-sources.md`](canon-and-sources.md)     | What counts as canon, how facts are cited and written     | Done   |
| [`conventions/ids.md`](conventions/ids.md)         | Entity kinds and how IDs are formed                       | Done   |
| [`model/dates.md`](model/dates.md)                 | In-universe dates, uncertainty, ordering, eras            | Done   |
| [`model/spoilers.md`](model/spoilers.md)           | The reader's chapter cutoff and what carries `revealedIn` | Done   |
| [`model/relationships.md`](model/relationships.md) | The edge-type vocabulary, memories, path weights          | Done   |
| [`features/paths-mode.md`](features/paths-mode.md) | The time-lane PATHS view                                  | Done   |

## Decisions

One short record per architecture decision, numbered in order.

| #    | Decision                                                                                               |
| ---- | ------------------------------------------------------------------------------------------------------ |
| 0001 | [Internal packages export TypeScript source](decisions/0001-internal-packages-as-typescript-source.md) |
| 0002 | [Pin TypeScript to 6.0.x](decisions/0002-pin-typescript-6.md)                                          |
| 0003 | [Run TypeScript directly on Node](decisions/0003-run-typescript-natively-on-node.md)                   |
| 0004 | [Database schema](decisions/0004-database-schema.md)                                                   |
| 0005 | [API design and deployment](decisions/0005-api-design.md)                                              |
| 0006 | [Web app architecture](decisions/0006-web-app.md)                                                      |
| 0007 | [Search](decisions/0007-search.md)                                                                     |
| 0008 | [Time is computed per reader chapter](decisions/0008-chapter-aware-time.md)                            |
| 0009 | [Analytics](decisions/0009-analytics.md)                                                               |
| 0010 | [Visual design and artwork](decisions/0010-design.md)                                                  |
| 0011 | [Game-menu redesign, boot screen and the Titan shift](decisions/0011-game-menu-redesign.md)            |
