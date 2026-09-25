# Canon and sources

- **Status:** Accepted
- **Date:** 2026-09-24

The rules every fact in PATHS must follow. When a new question comes up that these rules don't answer, decide it once, add it here, and apply it everywhere.

## 1. Canon scope

**If it isn't in manga chapters 1–139, it isn't in PATHS.**

| Source                                                                                      | In PATHS? |
| ------------------------------------------------------------------------------------------- | --------- |
| _Attack on Titan_ manga, chapters 1–139                                                     | ✅ Yes    |
| Anime-only scenes, and the anime's reordering of events                                     | ❌ No     |
| Spin-off manga and novels (_Before the Fall_, _No Regrets_, _Lost Girls_, _Junior High_, …) | ❌ No     |
| Official guidebooks and creator interviews                                                  | ❌ No     |
| Light novels, games, live-action films                                                      | ❌ No     |
| Fan wikis, fan theories, fan chronologies                                                   | ❌ No     |

Guidebooks and interviews are excluded to keep the rule one sentence long. Everything the graph needs — ages, years, relationships, events — is derivable from the chapters themselves.

## 2. Edition

Chapters are used in their **collected-volume (tankōbon) form**. Where a collected volume changed or extended a chapter, the collected version wins.

- In particular, the **extra pages added to chapter 139 in volume 34** are canon.

### Verification copies

Facts may be **verified** against any complete translation of a chapter. Where translations differ, the official English edition wins, and a fact confirmed only against an unofficial translation must be re-checked against the official edition before v1.0.

- Translation differences are mostly spellings; they become **aliases** (§7), never separate entities.
- Citations are to chapter numbers, which are the same in every edition, so re-checking never changes a citation.
- **Status:** v0.1 (chapters 1–53) was verified against an unofficial translation. Every fact from it is due for re-checking against the official edition.

## 3. Citations

- Every fact cites **at least one chapter**.
- A citation is a single chapter (`ch. 84`) or an inclusive range (`ch. 84–86`).
- Page numbers are optional and go in notes only — they differ between print and digital editions, so they are never the citation itself.
- Cite the chapter(s) that **show or state** the fact most clearly. A fact may cite several chapters.

Citations and the spoiler system (see `model/spoilers.md`) use the **same unit — the chapter**. A fact's _revealed-in_ chapter is the earliest chapter in which a reader can know it; its citations may include later chapters that confirm or clarify it.

The exact data schema for citations is defined in Phase 1.

## 4. Certainty

Every fact has one of two certainty levels:

| Level      | Meaning                                                 | Requirements                                                                                    |
| ---------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `stated`   | A chapter directly shows or says it.                    | Citation(s).                                                                                    |
| `inferred` | Derived from stated facts; no chapter says it outright. | Citations for **every** stated fact it's derived from, plus a short note showing the reasoning. |

Example of `inferred`: a character's birth year calculated from their stated age in a scene whose year is known.

Inferred facts must be derivations, not guesses. If a fact needs speculation to support it, it doesn't go in.

## 5. Contradictions

The manga occasionally disagrees with itself — for example, round figures such as "2,000 years" versus dates computed from other statements.

1. Prefer the **most specific** statement.
2. If equally specific, prefer the **later** chapter.
3. **Always** record the conflict in the fact's notes, citing both chapters. Never pick a side silently.

## 6. Truth policy

Much of what characters believe in _Attack on Titan_ turns out to be false — the origin of the Walls, Marley's account of history, early assumptions about the Titans.

- **PATHS records what the manga ultimately reveals to be true**, not what characters believed at the time.
- In-universe beliefs, claims and propaganda are **not stored in v1**. (A future `claim` model — "who believed what, and when was it disproved" — is a possible feature, not a v1 commitment.)
- _When_ the reader learns a truth is handled by the spoiler system, not by storing the earlier false belief.

## 7. Names, spelling and disambiguation

**Spelling.** English translations romanize some names differently (e.g. _Jaeger_ / _Yeager_, _Bertholdt_ / _Bertolt_).

- The **display name** is the most widely recognized spelling today (e.g. **Eren Yeager**).
- **Every** other spelling is stored as an **alias**, so search finds all of them.
- When the most recognized spelling is unclear, decide once when the entity is added and note the choice.

**Identity.** One real-world-of-the-story individual is one entity:

- **Historia Reiss** and **Krista Lenz** are the same person → one entity, `Krista Lenz` as an alias.

Different individuals are always separate entities, however similar their names:

- **Ymir** (104th Training Corps) ≠ **Ymir Fritz**
- **Eren Kruger** ≠ **Eren Yeager**

IDs never depend on spelling (see `conventions/ids.md`), so changing a display name never breaks a reference.

## 8. Writing and IP rules

- **All descriptions are written in our own words.**
- **Never copy text from wikis.** Fan-wiki text is typically CC BY-SA, which is incompatible with this project's CC BY-NC data license.
- Wikis and fan resources may be used **only to locate** a fact (e.g. to find which chapter something happens in). Every fact is **verified against the chapter itself** before it is cited.
- No manga panels, scans, or official artwork are stored in the repository.
- Direct quotes are limited to a short phrase, only when the exact wording matters, and always cite the chapter.
- Unverified facts never go into `data/`. Research notes and open questions live outside it.

## 9. Arcs

Arc names ("Uprising", "Marley", "War for Paradis", …) are **fan conventions**, not official divisions of the manga.

- PATHS defines its **own** arc list, with an exact, non-overlapping chapter range for every arc, covering chapters 1–139 with no gaps.
- The list lives in `data/` (Phase 1). This document only fixes the rule.
