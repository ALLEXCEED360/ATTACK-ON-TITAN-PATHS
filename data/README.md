# Data

The files in this folder are the **source of truth** for all canon data in PATHS.

- The database is always rebuilt from these files by the seed script — it is a derived copy.
- Never edit the database by hand. To change a fact, edit the file here and re-seed.
- Every fact must cite the manga chapter(s) it comes from, and be verified against the chapter itself ([canon rules](../docs/canon-and-sources.md)).

## Coverage

| Version | Chapters | Contents                                                                | Verified against           |
| ------- | -------- | ----------------------------------------------------------------------- | -------------------------- |
| v0.1    | 1–53     | 23 characters, 12 events, 11 locations, 5 factions, 4 Titans, 115 edges | Unofficial translation[^1] |

[^1]: Due for re-checking against the official edition (see [canon rules §2](../docs/canon-and-sources.md#2-edition)).

Not yet written: `reference/volumes.yaml`, `reference/arcs.yaml` and `reference/eras.yaml`. All three must cover the whole story (chapters 1–139), so they wait for the full source. `pnpm validate` shows a warning for each until then.

## Layout

```
data/
├── characters/   character_*.yaml   one file per entity, named after its ID
├── titans/       titan_*.yaml
├── events/       event_*.yaml
├── locations/    location_*.yaml
├── factions/     faction_*.yaml
├── memories/     memory_*.yaml
├── reference/
│   ├── volumes.yaml    volume → chapter ranges (the spoiler picker)
│   ├── arcs.yaml       PATHS-defined arcs, covering ch. 1–139
│   └── eras.yaml       timeline eras
└── id-redirects.yaml   retired IDs → replacements (after the first public deploy)
```

An entity's file holds its **outgoing edges**. A symmetric edge (e.g. `sibling_of`) is written once, in either entity's file.

## Example

```yaml
# data/characters/character_example.yaml
id: character_example
names:
  - name: "Example Person"
    revealedIn: 3
description:
  - { text: "What a reader learns first, in our own words.", revealedIn: 3 }
revealedIn: 3
sources: [3, [10, 12]]
born:
  date: { year: 835 }
  revealedIn: 10
  sources: [10]
  certainty: inferred
  notes: "Stated to be 15 in a scene dated 850 (ch. 10)."
edges:
  - type: member_of
    target: faction_example
    from: { event: event_example }
    revealedIn: 3
    sources: [3]
    certainty: stated
```

## Checking your work

- **As you type:** VS Code validates each file against its schema and autocompletes field names (needs the Red Hat YAML extension).
- **Before committing:** run `pnpm validate` — it checks everything the editor can't: references, reveal order, Titan holders, arcs, eras and more. `pnpm check` (and CI) include it.
