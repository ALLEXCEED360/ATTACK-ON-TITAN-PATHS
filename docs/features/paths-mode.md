# PATHS mode

- **Status:** Accepted (design) — built in Phase 8
- **Date:** 2026-09-24

PATHS mode is the project's signature view. The normal graph answers **"what is connected to what?"** PATHS mode answers **"how does this connect across time?"** — through Titan inheritance, memories (including memories received before they happened), and chains of cause and effect.

## 1. Goal

A reader should be able to select one entity and see, **in a single view**:

- the line of holders a Titan power passed through, and when;
- whose memories a character received, from when, and by what means;
- memories that travel **backwards** in time;
- the chain of events that led to (and from) a key event.

Success test: for any Titan, a reader can trace its full line of holders — and the memories that passed along that line — without leaving the view.

## 2. Entering and leaving

- Select an entity (character, Titan, event or memory), then press the **PATHS** button or the `P` key.
- The graph **animates** into the PATHS layout (§5). `Esc` or the button returns to the normal graph with the same selection.
- If the entity has no temporal connections to show, PATHS mode says so instead of opening an empty view.

## 3. Layout

A **time-lane diagram**:

```
            ◀──────────── world time (era scale) ────────────▶

Titan lane   ▓▓▓ holder 1 ▓▓▓│▓▓▓ holder 2 ▓▓▓│▓▓ holder 3 ▓▓
                                   ╭───────────────╮
Character A  ━━━━━━━━●━━━━━━━━━━━━━┿━━━━━━━┫        │  (memory arc)
                     │ caused      │               ▼
Character B          ╰────────▶ ●━━┷━━━━━━━━━━━━━━━●━━━━━━━┫
```

- **Horizontal axis:** world time, using the **same era scale** as the timeline (`model/dates.md` §9).
- **Lanes (rows):**
  - **Titan lanes** — one per Titan power involved, divided into segments, one per holder (from `holds` edges).
  - **Character lanes** — a bar from `born` to `died` (fading where dates are uncertain).
- **Markers:** events are dots on the lanes of the characters who took part.
- **Arcs:**
  - **Memory arcs** run from the memory's origin (the experiencer's lane, at the time it was experienced) to the receiver's lane (at the time it was received).
  - **Forward** arcs curve **above** the lanes; **backward** arcs (received before they were experienced) curve **below** in a distinct colour — they are the visual signature of PATHS mode.
  - **Causal arrows** connect event markers (`caused`).
- **Uncertain dates** are drawn as fuzzy/dashed spans, consistent with the time slider (`model/dates.md` §8).

## 4. What gets included

Starting from the selected entity **X**, the view includes:

| If X is…        | Included                                                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| a **Titan**     | Its lane and every holder's lane; memories passed between those holders                                                              |
| a **character** | Their lane; lanes of every Titan they held and those Titans' other holders; characters linked to them by memories (either direction) |
| an **event**    | The participants' lanes; causal chains up to **2 steps** before and after                                                            |
| a **memory**    | The experiencer's and every receiver's lanes, and the event it depicts                                                               |

- The view shows at most **12 lanes**. Beyond that, the least-connected lanes collapse into a "+N more" row that can be expanded.
- Lane order: the selected entity first, then others by when they first appear in world time.
- **Everything is spoiler-filtered** at the reader's cutoff (`model/spoilers.md`). A reader who hasn't reached a reveal sees a shorter lineage — never a hint that it continues.

## 5. The transition

- Nodes that stay (the included set) **move** from their graph positions to their lane positions; everything else **fades out**. Reverse on exit.
- Duration about 600 ms.
- With `prefers-reduced-motion`, the transition is a simple cross-fade.

## 6. Interaction

- **Layers:** toggles for _Inheritance_, _Memories_, _Causality_ — any combination.
- **Hover** an arc, segment or marker → tooltip with a short description, dates and citations.
- **Click** an event, character or memory → selects it (updating the side panel and timeline, as elsewhere).
- **Double-click** a lane → re-centres PATHS mode on that entity.
- **Time cursor:** the global time slider draws a vertical line across the lanes; everything stays visible, and items after the cursor are dimmed.
- The URL records the selected entity and mode (not the spoiler cutoff), so a PATHS view can be shared.

## 7. Accessibility

A **list view** presents the same content as text, in world order, e.g.:

> _Year N_ — _Character_ receives a memory of _Event_, originally experienced by _Character_ in year M (via inheritance).

The list view is reachable by keyboard and is announced as the text alternative to the diagram.

## 8. Not in v1

- Automatic "playback" that animates through time.
- Sound design.
- Editing or annotating paths.

## 9. Build order (Phase 8)

1. **Static prototype:** hand-written JSON for one Titan lineage and its memories → render the lanes, arcs and markers. No data layer.
2. Connect to the real API (`/graph/...` with the cutoff and time parameters).
3. Add the inclusion rules (§4) and the lane limit.
4. Add the animated transition (§5).
5. Add the list view (§7) and the layer toggles.

## 10. Data it relies on

PATHS mode needs no special data — only what the model already defines:

- `holds` edges with `from`/`until` → Titan lanes;
- character `born`/`died` → character lanes;
- `memory` entities with `experienced`, `received` (with `via` and `from`) and `depicts` edges → memory arcs;
- `caused` edges → causal arrows;
- `revealedIn` on everything → spoiler filtering.
