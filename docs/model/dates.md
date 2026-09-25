# Date model

- **Status:** Accepted
- **Date:** 2026-09-24

How PATHS stores **in-universe time** — when things happen in the world of the story. (When the _reader_ learns things is a separate axis, covered in `model/spoilers.md`.)

## 1. One year axis

- All dates use **the manga's own year count** (e.g. 845, 850, 854) as a single integer axis.
- Years before year 1 are stored as **zero or negative integers**. There is no "BC"-style notation and no second calendar — the difference between two years is plain subtraction.
- Labels like "1003 B1" (from the original blueprint mockup) are not used.
- How far-past years are _displayed_ (e.g. "~2,000 years before the story") is a UI decision for Phase 6; storage is always the plain integer.

## 2. Dates are uncertainty ranges

Most dates in the manga are known only to the year, and some only roughly. So every date is treated as **the range of time it could refer to**. A date is written in one of two forms.

### Point — known to a given precision

```yaml
{ year: 850 }                     # sometime in 850
{ year: 850, month: 3 }           # sometime in March 850
{ year: 850, month: 3, day: 10 }  # a specific day
```

- `month` (1–12) requires `year`; `day` (1–31) requires `month`.
- Precision is implied by which fields are present — there is no separate precision field.

### Between — only known to lie within a range

```yaml
{ between: [{ year: 743 }, { year: 745 }] }
```

- Both ends are Points; the first must not be later than the second.
- Use this for anything approximate ("about", "roughly", "a few years later"). The width of the range _is_ the uncertainty — there is no separate "approximate" flag.
- An approximate date is almost always an **inferred** fact (see `canon-and-sources.md` §4): its notes must show how the range was derived and cite the chapters it came from.

### Resolved range

Every date resolves to an inclusive range **[earliest, latest]**:

| Written as                                    | earliest  | latest    |
| --------------------------------------------- | --------- | --------- |
| `{ year: 850 }`                               | 850-01-01 | 850-12-31 |
| `{ year: 850, month: 3 }`                     | 850-03-01 | 850-03-31 |
| `{ year: 850, month: 3, day: 10 }`            | 850-03-10 | 850-03-10 |
| `{ between: [{ year: 743 }, { year: 745 }] }` | 743-01-01 | 745-12-31 |

All comparisons, sorting and filtering use the resolved range.

## 3. No calendar arithmetic

PATHS never calculates weekdays, month lengths, leap years or durations below a year. Dates are **compared**, never subtracted below year precision. Internally, a resolved bound is a sortable integer:

```
year × 10000 + month × 100 + day      (earliest uses 01/01 for missing parts; latest uses 12/31)
```

## 4. Ordering within the same period

Many events share a year — several major events happen in 850 alone. Dates alone cannot order them.

- Events carry an optional integer **`seq`** that orders them **within the same resolved range**.
- Space values by 10 (`10`, `20`, `30`, …) so new events can be inserted without renumbering.
- Full sort order: **(earliest, seq, id)**.
- The validator **warns** when two events with the same resolved range both lack a `seq`.

Explicit `before`/`after` edges are **not** stored for ordering; order comes from dates plus `seq`. (Causal "caused" relationships are a separate thing — see `model/relationships.md`.)

## 5. Events: start and end

```yaml
start: { year: 850 }
end: { year: 850, month: 4 } # optional
```

- `start` is required. `end` is optional; without it, the event spans exactly its start range.
- `end` must not resolve earlier than `start`.

## 6. Referring to an event's date

Relationships often begin or end _at an event_ (e.g. a Titan power passing to a new holder). Instead of copying that event's date, refer to it:

```yaml
from: { event: event_example, at: start } # `at` defaults to start
until: { event: event_example, at: end }
```

The reference resolves to the event's `start` or `end` date. This keeps each date written **once**, so fixing an event's date fixes every relationship that depends on it. The validator rejects references to missing events and circular references.

## 7. When a relationship is active

Relationships (edges) have optional `from` and `until` — each either a date or an event reference.

- **`from` omitted** → active from the moment both endpoints exist.
- **`until` omitted** → active until either endpoint ceases to exist (e.g. a character's death), or the end of the story.
- Every edge is **automatically clipped** to the lifetimes of its endpoints — there is no need to write "until death".
- Lifetimes: a character exists from `born` to `died`, an event from `start` to `end`. Titans, locations, factions and **memories** are not bounded — a memory can be received before it was experienced, so its own date must not clip its edges.
- Some untimed edges connect things that never exist at the same moment (e.g. `caused` between two events). That's valid: they simply never appear in a single moment of the time slider, and are shown in untimed views and PATHS mode. Only an edge whose **explicit** `from`/`until` contradict its endpoints' lifetimes is an error.
- A relationship with a genuinely unknown end is given a `between` range for `until`, not left blank.

Characters have optional `born` and `died` dates (usually inferred); a missing `born` means "unknown — before their first dated appearance".

## 8. "The graph at time _t_"

The time slider shows the graph as it stands at a moment _t_. An edge is shown at _t_ if:

```
from.earliest ≤ t ≤ until.latest
```

If _t_ falls inside an uncertain part (between `from.earliest` and `from.latest`, or between `until.earliest` and `until.latest`), the edge is shown as **uncertain** (e.g. dashed). The same rule applies to entities (from `born`/`start` to `died`/`end`).

## 9. Eras and the time scale

The timeline spans roughly two thousand years, but most events fall within about ten of them. A linear axis would squash the story into a sliver, so the timeline uses **eras**.

- Eras are PATHS-defined, like arcs, and live in `data/eras.yaml` (Phase 1).
- Each era has a name, a start year, an end year and a **display weight** — its share of the timeline's width.
- Eras are contiguous and non-overlapping, and together cover every date in the dataset. The validator enforces this.
- Within an era, time is linear. Across eras, width follows weight, not duration — so the main story can take most of the screen while two millennia of history stay visible.

Provisional era list (names and boundaries to be finalized in Phase 1):

| Era              | Covers                             | Weight |
| ---------------- | ---------------------------------- | ------ |
| Ancient era      | The origin of the Titans           | small  |
| Eldian Empire    | The empire's rule                  | small  |
| Great Titan War  | The war and the retreat to Paradis | small  |
| Era of the Walls | Life inside the Walls, up to 845   | medium |
| The story        | 845–854                            | large  |
| After the story  | The epilogue and later             | small  |

## 10. Summary for the Phase 1 schema

```ts
type Point = { year: number; month?: number; day?: number };
type InUniverseDate = Point | { between: [Point, Point] };
type DateRef = InUniverseDate | { event: EntityId; at?: "start" | "end" };

// Event:     start: InUniverseDate; end?: InUniverseDate; seq?: number
// Character: born?: InUniverseDate; died?: InUniverseDate
// Edge:      from?: DateRef; until?: DateRef
```
