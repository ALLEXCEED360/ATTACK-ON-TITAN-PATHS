# 0010 — Visual design and artwork

- **Status:** Accepted
- **Date:** 2026-09-25

## Context

Phases 4–9 built a deliberately plain interface. The goal for the design pass is a cinematic, game-menu quality, at least on par with the author's earlier portfolio projects. The owner wants official _Attack on Titan_ artwork and relevant fan art in the interface, committed to the public repository with credits. Artwork brings two problems data doesn't have:

- Images spoil just as text does.
- Images are someone else's copyrighted work.

## Decision

- **Direction: a Survey Corps field archive.**
  - Colours: night-dark ink, aged parchment, brass fittings.
  - Type: condensed poster type (Big Shoulders Display) for titles, a book serif (Source Serif 4) for the story's own text, Inter for the interface, and JetBrains Mono for clerk-style labels. All are self-hosted through Fontsource, with no third-party font CDN.
  - Film grain over the whole app, cut-corner "stamped plate" buttons, and brass hairline rules.
- **Motion** uses the `motion` library:
  - A title screen with letter-by-letter entrance and "press any key".
  - A diagonal ink-and-brass curtain wipe between sections. Moving within a section only fades.
  - A brass nav underline that grows in (CSS).
  - Honours `prefers-reduced-motion`, which reduces everything to short fades. Tests run with animations skipped.
- **Artwork:**
  - Every image is listed in `apps/web/src/art/manifest.ts` with its artist, source, subjects and a `revealedIn` chapter. `artworkAt(cutoff)` is the only way pages get art, so art is spoiler-gated like data. The title screen, shown before the reader has picked a chapter, uses only chapter-1-safe art: the map of the Walls.
  - The first set is five official colour illustrations by Hajime Isayama: chapter colour pages, a volume cover and inside-cover map art. They are cropped from a local copy by `apps/web/scripts/extract_art.py` (crops are reproducible; lettering and watermarks are removed).
  - Fan art needs a named, linked artist (enforced by a test).
  - Everything is credited on `/credits`. `docs/canon-and-sources.md` §8 and the README state the policy, including removal on request.
- **Art is treated as mood, not content.** It's masked into the page (CSS masks, not overlays) and dimmed on small screens so text stays readable. No page depends on having art; each has an art-free fallback.

## Consequences

- ✅ The spoiler model covers images, with tests for gating, credits and missing files.
- ✅ The design holds up without art (early chapters, entities with no art), so art can be added or removed freely.
- ❌ The first images come from 800–1,200 px scans and look soft when full-bleed on large screens. Higher-resolution official art would need downloading, with the owner's approval of each file.
- ❌ Hosting copyrighted art in a public repository risks a takedown. The owner accepted this risk; the manifest makes removal a one-line change.
- ✅ **Bundle kept in check.** Motion uses `LazyMotion` (`strict`), so the `m` components ship without animation code and the `domAnimation` features (≈15 KB gzipped) load after first paint. Every page except Home is a lazy route. The main bundle is back to its pre-design size (≈135 KB gzipped); Cytoscape stays in its own chunk. Fonts load per unicode range, so only the Latin subsets are fetched in practice.
- ✅ **Accessibility audited with axe-core.** Every page, PATHS mode, the search and chapter dialogs, and both title-screen steps were checked in a real browser, including colour contrast. The findings were fixed: a missing h1 in the explorer, skipped heading levels on the Timeline, and the palette's highlighted row at 4.47:1. A jsdom test keeps the gate screens checked in CI.
