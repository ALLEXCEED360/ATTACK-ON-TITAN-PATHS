# 0011 — Game-menu redesign, boot screen and the Titan shift

- **Status:** Accepted
- **Date:** 2026-09-25
- **Amends:** 0010 (visual design and artwork)

## Context

After the first design pass (0010), the owner asked for four changes:

- far more art, especially for individual characters and Titans;
- a boot screen on every visit;
- a page transition that is unmistakably _Attack on Titan_, since the diagonal wipe was too close to their earlier projects;
- lettering like the series' own, with the menu-driven look of Atlus games (_Persona_, _Metaphor_) but in AoT's voice.

## Decision

- **Lettering.**
  - Names and titles use **Grenze Gotisch**, a sharp gothic close to the series' hand-lettered English logo. It is set in mixed case, because blackletter capitals don't read.
  - Numbers stay in Big Shoulders Display.
  - Kanji accents are **Shippori Mincho B1** at small sizes (it echoes the manga's own title lettering) and **Dela Gothic One** for huge outlined watermarks.
  - Each section has a kanji name: 探索 Explore, 名簿 Roster, 年表 Timeline, 分析 Analytics, and 道 for PATHS itself (the series' own word for the Paths).
  - All fonts are self-hosted and OFL-licensed. CJK fonts load only the chunks for the glyphs used.
- **Game-menu components.**
  - Slanted **slabs** for navigation and menus; the current item is a bone-white slab with a blood-red kanji.
  - Bone **ribbons** for labels.
  - A shared **PageHeader** (ribbon, gothic title, outlined kanji watermark).
  - Tilted **portrait cards**: bone border over a halftone slab, green for people and blood for Titans.
- **Art everywhere a person or Titan appears**, always behind the same `revealedIn` gate:
  - **Portraits:** 26 official portraits (22 characters, 3 Titans, and Eren's Titan form), manga and anime art hosted on the Attack on Titan Wiki. Only chapter-50-era likenesses are used, and each is hidden until its subject is revealed. Krista has none, because her only suitable render shows her from a much later arc.
  - **Volume covers:** covers 1–13, each hidden until the volume's last chapter.
  - Files are reproduced by `scripts/fetch_art.py`, which records the source of every image. Everything is credited on `/credits`, grouped by kind.
  - **Where portraits appear:**
    - The new **Roster** page, a character-select grid.
    - Entity pages, redesigned as **dossiers**: a portrait card with a switcher for other likenesses.
    - A **cast parade** on the home page, slanted portrait strips that open on hover.
    - **Inside the graph**, where portrait nodes are clipped to their shapes.
  - A **Your shelf** row on the home page shows the covers of volumes the reader has finished.
- **Boot screen on every visit.**
  - The three Walls draw in as concentric rings around 道, the gothic wordmark rises, and a status line reports the archive.
  - It doubles as a **warm-up for the API**: the free host sleeps, so the boot pings `/health` and waits (at least 2.6 s, at most 6 s) for it to wake.
  - Any key or click skips it. With the boot as the intro, first-time readers go straight to the chapter question.
- **The Titan shift** replaces the diagonal wipe between sections.
  - Leaving a page: a lightning bolt strikes (revealed with a clip, not stroke dashes, which break on a stretched SVG), then one warm flash, a shudder of the old page, and transformation steam billowing over the screen.
  - Arriving: the steam lifts off the new page.
  - There is a single flash, never repeated, to stay photosensitivity-safe. Reduced motion gets a short fade.
  - The shudder moves only an inner wrapper, because a transform on the outer one would pin the fixed steam layer to the page instead of the screen.

## Consequences

- ✅ Every character and Titan the reader has met has a face, except Krista, whose card shows a kanji placeholder until safe art exists. The spoiler gate is tested per portrait and per cover.
- ✅ The boot's wait is useful rather than decorative: the first page loads against a warm API.
- ✅ The axe audit is clean on every page, including the boot screen and the roster. The home shelf scrolls sideways, so it is keyboard-focusable.
- ❌ About 5 MB of committed art (WebP). Pages only load what they show, and portraits are lazy-loaded.
- ❌ More third-party imagery in a public repository (anime stills as well as manga art). The owner approved the download list, and removal remains a one-line manifest change.
