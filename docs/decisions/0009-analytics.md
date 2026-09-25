# 0009 — Analytics

- **Status:** Accepted
- **Date:** 2026-09-25

## Context

The blueprint asks for an analytics view of the story in numbers. Three risks come with it:

- **Spoilers.** A count leaks as surely as a name. "7 deaths" at chapter 5 tells the reader two more are coming.
- **False precision.** Most dates are known only to the year. Naive overlap checks treat everything in 850 as simultaneous, so a squad formed after a battle appears to have fought in it.
- **Misreading metrics as importance.** Degree and betweenness are properties of our graph (of which relationships we happened to record), not of the story.

## Decision

- **One pure function, one endpoint.** `analytics(view)` in graph-core takes a reader's view (`viewGraph`, decision 0008) and nothing else, so every figure is computed only from what the reader knows, including masked death dates. `GET /analytics?cutoff=` attaches display names as known at the cutoff. The spoiler crawler requests it at every reveal boundary.
- **What it returns:**
  - totals, including known deaths;
  - events per in-universe year (empty years kept, events in story order);
  - the eight most connected characters, with degree, betweenness and relationships active per year;
  - faction co-participation;
  - Titan holders.
- **Faction co-participation counts a member only while they belonged.** Membership is checked by date first. When the dates can't tell (both in 850), the events that `from`/`until` refer to are compared in story order (`seq`, `docs/model/dates.md` §4). For that, edges now carry `anchors`: the event references from their `from`/`until`, kept from the data files and from the stored `from_ref`/`until_ref`. A new DB test checks that the graph loaded from Postgres equals the one built from `data/`.
- **Charts follow the dataviz method:**
  - each chart's form is chosen for its job: stat tiles for totals, an emphasis line chart for connections over time, columns for events per year, and a lower-triangle heatmap on the validated single-hue brass ramp for faction pairs;
  - identity is never carried by colour alone;
  - every chart has a table view;
  - tooltips add detail but never gate it.
- **Wording:** the metrics table says outright that it measures the graph, not importance. "Betweenness" is labelled **bridging**.

## Consequences

- ✅ Analytics can't leak what the time model hides, because they're built on the same masked view.
- ✅ The heatmap no longer credits the Special Operations Squad with the Battle of Trost.
- ❌ Our data has no one recorded as taking part in the 104th's graduation, so that faction has no co-participation yet. The UI lists such factions instead of drawing an empty row. This will fill in as data grows.
- ❌ Story-order comparison only helps when both events share a resolved date and both have `seq`. Otherwise it falls back to date overlap, which errs towards counting.
