# Spoiler model

- **Status:** Accepted
- **Date:** 2026-09-24

_Attack on Titan_ is built on reveals. A knowledge graph that shows everything would spoil the whole story on its first screen. PATHS therefore shows each reader **only what the manga has revealed up to the chapter they have reached**.

This creates PATHS' second time axis:

| Axis           | Question it answers              | Unit    | Defined in       |
| -------------- | -------------------------------- | ------- | ---------------- |
| **World time** | When did it happen in the story? | Date    | `model/dates.md` |
| **Story time** | When does the reader find out?   | Chapter | this document    |

## 1. The reader's cutoff

- Each reader has a **cutoff**: the last chapter they have read, from 1 to 139.
- PATHS shows only facts whose **revealed-in chapter ≤ cutoff**.
- `139` means "I've finished" — everything is visible.

### Choosing a cutoff

- On first visit, PATHS asks **"Where are you in the story?"** before showing any data. The prompt cannot be skipped, but it offers a one-click **"I've finished the manga"**.
- The picker accepts a **chapter** or a **volume** (1–34). A volume maps to its **last** chapter.
- The cutoff can be changed at any time from the header.
- The cutoff is stored **in the browser only** (no accounts). It is never put in URLs, so a shared link never carries the sharer's cutoff to someone else.
- Anime-episode mapping is **deferred** (see §9).

## 2. What `revealedIn` means

`revealedIn` is **the earliest chapter in which a reader can know the fact**.

- It is always a single chapter number, 1–139.
- It must be **cited**: the `revealedIn` chapter must be one of the fact's citations (or inside a cited range). A reveal nobody can point to isn't a reveal.
- For an **inferred** fact, `revealedIn` is the chapter in which the **last** fact it depends on is revealed.
- World time and story time are independent. An event can happen in the distant past and be revealed in a late chapter — that's normal, and it's exactly what the two axes are for.

## 3. What carries `revealedIn`

Spoilers leak through more than entities and edges. Everything that can reveal something carries its own `revealedIn`.

| Item                                          | `revealedIn` required? | Notes                                                                                 |
| --------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------- |
| **Entity**                                    | Required               | The chapter of first appearance. Before it, the entity does not exist for the reader. |
| **Edge**                                      | **Always required**    | No default. Edges are the most common leak, so each one is set deliberately.          |
| **Name** (an identity)                        | Required               | See §4.                                                                               |
| **Alias** (spelling variant)                  | Inherits from its name | Can be overridden.                                                                    |
| **Description segment**                       | Required               | Descriptions are split into segments — see §5.                                        |
| **Lifespan** (`born`, `died`, `start`, `end`) | Required per date      | A death is often revealed separately from the character's first appearance.           |
| **Attribute** (any other field)               | Inherits from entity   | Must be overridden when the attribute is itself a reveal.                             |

Consistency rule: **a fact cannot be revealed before the things it mentions.** An edge's `revealedIn` must be ≥ the `revealedIn` of both endpoints; a date referring to an event must be ≥ that event's `revealedIn`. The validator enforces this.

## 4. Names change with the cutoff

Some characters are known under one name before a reveal and another after it. An entity has an **ordered list of names**, each with its own `revealedIn`:

```yaml
names:
  - { name: "Krista Lenz", revealedIn: 10 }
  - { name: "Historia Reiss", revealedIn: 55 }
```

_(Chapter numbers are illustrative only.)_

- The **display name** at a given cutoff is the **last** name with `revealedIn ≤ cutoff`.
- All revealed names remain searchable; unrevealed ones are not.
- Spelling variants are attached to the name they belong to and inherit its `revealedIn`.
- The entity's **ID** never changes and is always spoiler-safe (see `conventions/ids.md` §5).

## 5. Descriptions are segmented

A single paragraph written with full knowledge of the story would spoil everything. Descriptions are a list of segments:

```yaml
description:
  - { text: "…what a new reader learns first…", revealedIn: 1 }
  - { text: "…what a later chapter reveals…", revealedIn: 72 }
```

The UI shows, in order, every segment with `revealedIn ≤ cutoff`. Each segment must read correctly **without** the ones that follow it.

## 6. Hidden means absent

Anything past the cutoff is **completely absent** — not greyed out, blurred or "redacted".

- Placeholders leak information: "3 hidden connections" tells the reader that more is coming, and roughly where.
- This applies to **everything derived from the data**, not only to what's listed directly:
  - **counts** ("Connections: 57") are counted on the filtered graph;
  - **search** only matches revealed names, aliases and text;
  - **graph algorithms** (paths, centrality, clusters) run on the filtered graph;
  - **analytics** are computed from filtered data;
  - **timeline density** counts only revealed events.
- Opening a link to something past the cutoff shows a neutral message ("This is beyond your current chapter"). IDs are spoiler-safe, so the message reveals nothing.

## 7. Enforcement is server-side

- Every API endpoint takes the cutoff as a parameter and **filters before responding**. Data past the cutoff never reaches the browser, so it can't be found in developer tools or network responses.
- Cached responses are keyed by cutoff.
- The full, unfiltered dataset exists only in `data/`, the database and the seed script.
- Tests cover the filter directly: for sample cutoffs, no response may contain anything with `revealedIn` > cutoff.

## 8. Story order

Because every event carries `revealedIn`, the timeline can be switched between:

- **World order** — sorted by date (`model/dates.md` §4);
- **Story order** — sorted by `revealedIn`, then by world order.

Switching between the two shows the structure of the manga itself: flashbacks, late reveals and memories appear as jumps between the two orders.

## 9. Deferred (not in v1)

- **Anime-episode picker.** The anime reorders and cuts some material, so an episode maps to a chapter only conservatively (the latest chapter whose content is _fully_ adapted by that episode). Needs a careful mapping table — a post-v1 feature.
- **Per-reader "reveal on click"** — letting a reader deliberately peek at a single hidden fact.
- **In-universe beliefs** that are later disproved (see `canon-and-sources.md` §6).
