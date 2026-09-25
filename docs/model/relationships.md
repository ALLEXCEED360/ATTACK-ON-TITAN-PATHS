# Relationships

- **Status:** Accepted
- **Date:** 2026-09-24

The complete vocabulary of edges in PATHS. An edge type that isn't in this document doesn't exist. Adding one means adding a row here first.

## 1. Principles

1. **Store facts, derive the rest.** If something can be computed from other data, it is not stored. This avoids duplicate facts that can contradict each other.
2. **Only relationships the manga establishes.** Every edge must meet the `stated`/`inferred` standard in `canon-and-sources.md` §4.
3. **No interpretive relationship types.** `friend`, `enemy`, `rival`, `loves` are readings of the story, not facts in it — and they shift constantly. They are not part of v1.
4. **Avoid hubs.** A relationship that would connect almost everything to one node (e.g. every Eldian to the Paths) becomes an attribute instead, so it doesn't make every entity two steps from every other.

## 2. Anatomy of an edge

Every edge has these fields:

| Field        | Required | Meaning                                                               |
| ------------ | -------- | --------------------------------------------------------------------- |
| `source`     | ✅       | Entity ID                                                             |
| `type`       | ✅       | One of the types in §4                                                |
| `target`     | ✅       | Entity ID                                                             |
| `revealedIn` | ✅       | Chapter — see `model/spoilers.md`                                     |
| `sources`    | ✅       | Chapter citations — see `canon-and-sources.md` §3                     |
| `certainty`  | ✅       | `stated` or `inferred` (inferred requires `notes`)                    |
| `from`       | —        | Date or event reference — see `model/dates.md` §6–7                   |
| `until`      | —        | Date or event reference                                               |
| `notes`      | —        | Reasoning for inferred facts, recorded contradictions, clarifications |
| _attributes_ | —        | Type-specific fields listed in §4 (e.g. `role`)                       |

An edge's identity is **(source, type, target, from)** — see `conventions/ids.md` §2. The same pair may be connected by the same type more than once if the periods differ (e.g. leaving and later rejoining a faction).

## 3. Direction

- **Directed** types read `source → target` (e.g. `parent_of`). The UI shows the **inverse label** when viewing from the target's side.
- **Symmetric** types have no direction (e.g. `sibling_of`). They are stored **once**; the validator rejects an edge whose reverse already exists.

## 4. Edge types

**Kinds:** C = character, T = titan, E = event, L = location, F = faction, M = memory.
**Weight** is the cost used by shortest-path search (§6) — lower means "a stronger, more meaningful link".

### Structural — who is related to whom, who belongs where

| Type          | Source → Target | Dir.      | Time-bounded | Attributes       | Inverse label | Weight |
| ------------- | --------------- | --------- | ------------ | ---------------- | ------------- | ------ |
| `parent_of`   | C → C           | directed  | no           | —                | child of      | 1      |
| `sibling_of`  | C — C           | symmetric | no           | `half?: boolean` | —             | 1      |
| `spouse_of`   | C — C           | symmetric | yes          | —                | —             | 1      |
| `holds`       | C → T           | directed  | yes          | —                | held by       | 1      |
| `member_of`   | C → F           | directed  | yes          | `role?: string`  | has member    | 3      |
| `leads`       | C → F           | directed  | yes          | `title?: string` | led by        | 2      |
| `part_of`     | F → F, L → L    | directed  | yes          | —                | includes      | 3      |
| `born_in`     | C → L           | directed  | no           | —                | birthplace of | 2      |
| `lives_in`    | C → L           | directed  | yes          | —                | home of       | 3      |
| `based_at`    | F → L           | directed  | yes          | —                | base of       | 3      |
| `controls`    | F → L           | directed  | yes          | —                | controlled by | 3      |
| `allied_with` | F — F           | symmetric | yes          | —                | —             | 2      |
| `at_war_with` | F — F           | symmetric | yes          | —                | —             | 2      |

### Event — what happened, where, and to whom

| Type              | Source → Target | Dir.     | Time-bounded       | Attributes                           | Inverse label | Weight |
| ----------------- | --------------- | -------- | ------------------ | ------------------------------------ | ------------- | ------ |
| `participated_in` | C → E, F → E    | directed | no (event's dates) | `role?: string`, `side?: faction ID` | participant   | 2      |
| `occurred_at`     | E → L           | directed | no (event's dates) | —                                    | site of       | 2      |
| `sub_event_of`    | E → E           | directed | no                 | —                                    | includes      | 1      |
| `killed`          | C → C           | directed | no                 | `in?: event ID`                      | killed by     | 1      |

### Causal — why things happened

| Type     | Source → Target | Dir.     | Time-bounded | Attributes | Inverse label | Weight |
| -------- | --------------- | -------- | ------------ | ---------- | ------------- | ------ |
| `caused` | E → E           | directed | no           | —          | caused by     | 1      |

`caused` means **the manga establishes that the source event led directly to the target event**. It is the only relationship type that makes a claim about _why_, so it holds the highest bar: if the connection has to be argued rather than shown, it is `inferred` and the reasoning goes in `notes`. Loose "it contributed to" links are not recorded.

### Paths — memory across time

| Type          | Source → Target | Dir.     | Time-bounded | Attributes                                   | Inverse label  | Weight |
| ------------- | --------------- | -------- | ------------ | -------------------------------------------- | -------------- | ------ |
| `experienced` | C → M           | directed | no           | —                                            | experienced by | 1      |
| `received`    | C → M           | directed | yes (`from`) | `via: "inheritance" \| "contact" \| "paths"` | received by    | 1      |
| `depicts`     | M → E           | directed | no           | —                                            | depicted in    | 1      |

See §5 for how memories work.

## 5. Memories

**Decision: a memory is an entity (`memory_*`), not an edge.** This finalizes the provisional kind in `conventions/ids.md` §2.

A memory involves several things at once — whose experience it was, who later received it, when each happened, and which event it shows. An edge can only connect two things, so a memory is a node that edges connect to:

```
character A ──experienced──▶ memory ──depicts──▶ event
character B ──received─────▶ memory     (from: when B received it)
```

- A memory's own date is **when it was originally experienced** (its `start` date, as for events).
- A `received` edge's `from` is **when it was received**.
- **Memories from the future need no special type.** When a memory is received _before_ it was experienced, that follows from the two dates, and PATHS mode draws it as a backward arc (see `features/paths-mode.md`). Storing it separately would duplicate what the dates already say.
- `via` records the mechanism: `inheritance` (through inheriting a Titan), `contact` (triggered by touching or seeing someone), or `paths` (through the Paths directly).
- Create a memory entity only when the manga **shows a specific memory being experienced or received and it matters to the story** — not for every flashback.

## 6. Shortest path

Weights make "how is A connected to B?" produce meaningful answers:

- Family, Titan holding, killings, memories and causality weigh **1** — strong, specific links.
- Participation and location links weigh **2**; membership, residence and hierarchy weigh **3** — weaker, because factions and places have many members.
- The UI lets users exclude categories and individual entities (e.g. "not via the Survey Corps"), since large factions still attract paths.
- All path searches run on the **spoiler-filtered graph at the current time** (`model/spoilers.md` §6, `model/dates.md` §8).

## 7. Derived, never stored

| Not stored                           | Derived from                                                        |
| ------------------------------------ | ------------------------------------------------------------------- |
| `before` / `after` / `during`        | Dates + `seq` (`model/dates.md` §4)                                 |
| Titan inheritance ("inherited from") | Consecutive `holds` edges on the same Titan                         |
| Arc of an event                      | The arc whose chapter range contains the event's `revealedIn`       |
| Grandparents, cousins, etc.          | Chains of `parent_of`                                               |
| Co-participants in an event          | Shared `participated_in` targets                                    |
| "Connected to the Paths"             | The character attribute `subjectOfYmir` (with its own `revealedIn`) |
| Deaths as an event list              | `died` dates and `killed` edges                                     |

## 8. Categories in the UI

Each type belongs to one category, which controls colour, filtering and which layers PATHS mode shows:

| Category       | Types                                                                                                                                                         |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Structural** | `parent_of`, `sibling_of`, `spouse_of`, `holds`, `member_of`, `leads`, `part_of`, `born_in`, `lives_in`, `based_at`, `controls`, `allied_with`, `at_war_with` |
| **Event**      | `participated_in`, `occurred_at`, `sub_event_of`, `killed`                                                                                                    |
| **Causal**     | `caused`                                                                                                                                                      |
| **Paths**      | `experienced`, `received`, `depicts`                                                                                                                          |

PATHS mode draws the Paths category plus `holds` (Titan lineages) and `caused` — see `features/paths-mode.md`.

## 9. Validator rules (Phase 1)

- `type` is one of §4; source and target kinds match that type's row.
- Symmetric edges exist in one direction only.
- Time-bounded attributes (`from`/`until`) appear only on time-bounded types.
- `revealedIn` and citations follow `model/spoilers.md` §2–3.
- `certainty: inferred` has `notes`.
- No two edges share (source, type, target, from).
- No `parent_of` cycles; no `sub_event_of` cycles; no `caused` cycles.
- A Titan has at most one holder at any moment (overlapping `holds` intervals on the same Titan are rejected).
