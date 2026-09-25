# 0005 — API design and deployment

- **Status:** Accepted
- **Date:** 2026-09-24

## Context

The web app needs read-only access to the knowledge graph, always filtered by the reader's spoiler cutoff (`model/spoilers.md` §7: enforcement is server-side). The data only changes when `data/` changes and is redeployed.

## Decision

**Fastify 5 with Zod schemas** (`fastify-type-provider-zod`), in `apps/api`, running TypeScript directly on Node (ADR 0003).

| Endpoint                      | Purpose                                                        |
| ----------------------------- | -------------------------------------------------------------- |
| `GET /entities`               | Entities the reader knows about (optionally by kind)           |
| `GET /entities/:id`           | One entity: revealed names, description, dates, citations      |
| `GET /graph/neighborhood/:id` | Everything within 1–3 connections, optionally at a moment `at` |
| `GET /graph/path`             | The strongest chain of connections between two entities        |
| `GET /timeline`               | Events in world order or story order                           |
| `GET /search`                 | Fuzzy search over revealed names and spellings                 |
| `GET /health`, `GET /docs`    | Health check; interactive OpenAPI docs                         |

**Spoiler safety, in layers:**

1. **`cutoff` is required** on every data endpoint (1–139). There's no default, so a client can never forget it.
2. **Filtering happens before serialisation.** Unrevealed names, description segments, dates, citations and edges are dropped. Citations are clipped to the cutoff. Reasoning notes appear only once every chapter they draw on is reached. Editorial entity notes are never exposed.
3. **Every response has a strict Zod schema.** Unknown fields are stripped, and a response that doesn't match its schema fails with a 500 instead of being sent.
4. **A spoiler crawler test** requests every endpoint for every visible entity at the chapter just before each reveal in the dataset, and fails if any response contains an unrevealed ID, name, spelling or description. (On its first run it found three leaks in the data's own wording.)

**Graph queries run in memory** with graph-core, on a graph loaded from Postgres at startup. The dataset is small, and graph-core is already tested to agree with the SQL queries. Details, timeline and search are read from Postgres.

**Caching:** data responses send `Cache-Control: public, max-age=300`.

**Deployment:** a Docker image (`apps/api/Dockerfile`) bundles the code and `data/`. On start it applies migrations and **reseeds the database from the bundled data**, then serves. The live database always matches the deployed data, with no separate release step. Hosting: Render (free web service, from `render.yaml`) and Neon (free Postgres).

## Consequences

- ✅ Spoiler safety doesn't depend on any single check.
- ✅ One command deploys code and data together, and CI builds the image on every push.
- ❌ Reseeding on start assumes a single instance. With several, move the seed to a release step.
- ❌ Render's free tier sleeps when idle, so the first request after a while takes longer.
- ❌ The in-memory graph must be reloaded after a reseed. A server restart does this, which deployment always implies.
