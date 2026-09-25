import { createHash } from "node:crypto";
import { type Dataset, activeInterval, lifetimeOf, timeRefsOf } from "@paths/data";
import type { Interval } from "@paths/graph-core";
import { EDGE_TYPES, type Edge } from "@paths/shared";
import { sql } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import type { Db } from "./client.ts";
import * as t from "./schema.ts";

// Rebuilds every table from a validated dataset (docs/decisions/0004-database-schema.md).

type Insert<T extends PgTable> = T["$inferInsert"];

export interface SeedRows {
  entities: Insert<typeof t.entities>[];
  entityNames: Insert<typeof t.entityNames>[];
  descriptionSegments: Insert<typeof t.descriptionSegments>[];
  characters: Insert<typeof t.characters>[];
  events: Insert<typeof t.events>[];
  memories: Insert<typeof t.memories>[];
  edges: Insert<typeof t.edges>[];
  volumes: Insert<typeof t.volumes>[];
  arcs: Insert<typeof t.arcs>[];
  eras: Insert<typeof t.eras>[];
  idRedirects: Insert<typeof t.idRedirects>[];
}

function bounds(interval: Interval) {
  return {
    startEarliest: interval.start?.earliest ?? null,
    startLatest: interval.start?.latest ?? null,
    endEarliest: interval.end?.earliest ?? null,
    endLatest: interval.end?.latest ?? null,
  };
}

const COMMON_EDGE_FIELDS = new Set([
  "type",
  "source",
  "target",
  "revealedIn",
  "sources",
  "certainty",
  "notes",
  "from",
  "until",
]);

/** A stable ID from the edge's identity: (source, type, target, from). */
export function edgeId(edge: Edge): string {
  const key = [edge.source, edge.type, edge.target, JSON.stringify(timeRefsOf(edge).from ?? null)];
  return `edge_${createHash("sha256").update(key.join("|")).digest("hex").slice(0, 16)}`;
}

/** Converts a validated dataset into table rows. Pure — no database access. */
export function buildSeedRows(dataset: Dataset): SeedRows {
  const rows: SeedRows = {
    entities: [],
    entityNames: [],
    descriptionSegments: [],
    characters: [],
    events: [],
    memories: [],
    edges: [],
    volumes: (dataset.volumes ?? []).map(({ volume, chapters: [first, last] }) => ({
      volume,
      firstChapter: first,
      lastChapter: last,
    })),
    arcs: (dataset.arcs ?? []).map(({ id, name, chapters: [first, last] }) => ({
      id,
      name,
      firstChapter: first,
      lastChapter: last,
    })),
    eras: (dataset.eras ?? []).map((era, position) => ({ ...era, position })),
    idRedirects: Object.entries(dataset.redirects).map(([oldId, newId]) => ({ oldId, newId })),
  };

  for (const { entity } of dataset.entities.values()) {
    const { id } = entity;
    rows.entities.push({
      id,
      kind: entity.kind,
      revealedIn: entity.revealedIn,
      sources: entity.sources,
      notes: entity.notes ?? null,
      ...lifeColumns(lifetimeOf(entity)),
    });

    const seen = new Set<string>();
    entity.names.forEach((name, position) => {
      for (const [value, isPrimary] of [
        [name.name, true],
        ...(name.variants ?? []).map((variant) => [variant, false] as const),
      ] as const) {
        if (seen.has(value)) continue;
        seen.add(value);
        rows.entityNames.push({
          entityId: id,
          position,
          name: value,
          isPrimary,
          revealedIn: name.revealedIn,
        });
      }
    });

    entity.description.forEach((segment, position) => {
      rows.descriptionSegments.push({
        entityId: id,
        position,
        text: segment.text,
        revealedIn: segment.revealedIn,
      });
    });

    switch (entity.kind) {
      case "character":
        rows.characters.push({
          entityId: id,
          born: entity.born ?? null,
          died: entity.died ?? null,
          subjectOfYmir: entity.subjectOfYmir ?? null,
        });
        break;
      case "event":
        rows.events.push({
          entityId: id,
          start: entity.start,
          end: entity.end ?? null,
          seq: entity.seq ?? null,
        });
        break;
      case "memory":
        rows.memories.push({ entityId: id, start: entity.start });
        break;
      case "titan":
      case "location":
      case "faction":
        break;
    }
  }

  for (const loaded of dataset.edges) {
    const { edge } = loaded;
    const { from, until } = timeRefsOf(edge);
    const definition = EDGE_TYPES[edge.type];
    rows.edges.push({
      id: edgeId(edge),
      sourceId: edge.source,
      targetId: edge.target,
      type: edge.type,
      category: definition.category,
      revealedIn: edge.revealedIn,
      sources: edge.sources,
      certainty: edge.certainty,
      notes: edge.notes ?? null,
      attributes: Object.fromEntries(
        Object.entries(edge).filter(([key]) => !COMMON_EDGE_FIELDS.has(key)),
      ),
      fromRef: from ?? null,
      untilRef: until ?? null,
      ...activeColumns(activeInterval(dataset, loaded)),
      weight: definition.weight,
    });
  }

  return rows;
}

function lifeColumns(interval: Interval) {
  const b = bounds(interval);
  return {
    lifeStartEarliest: b.startEarliest,
    lifeStartLatest: b.startLatest,
    lifeEndEarliest: b.endEarliest,
    lifeEndLatest: b.endLatest,
  };
}

function activeColumns(interval: Interval) {
  const b = bounds(interval);
  return {
    activeStartEarliest: b.startEarliest,
    activeStartLatest: b.startLatest,
    activeEndEarliest: b.endEarliest,
    activeEndLatest: b.endLatest,
  };
}

const CHUNK = 500;

async function insertAll<T extends PgTable>(db: Db, table: T, values: Insert<T>[]) {
  for (let i = 0; i < values.length; i += CHUNK) {
    await db.insert(table).values(values.slice(i, i + CHUNK));
  }
}

/** Replaces the whole database contents in one transaction: either all of it lands, or none. */
export async function seed(db: Db, rows: SeedRows): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.execute(
      sql`truncate ${t.entities}, ${t.volumes}, ${t.arcs}, ${t.eras}, ${t.idRedirects} cascade`,
    );
    const txDb = tx as unknown as Db;
    await insertAll(txDb, t.entities, rows.entities);
    await insertAll(txDb, t.entityNames, rows.entityNames);
    await insertAll(txDb, t.descriptionSegments, rows.descriptionSegments);
    await insertAll(txDb, t.characters, rows.characters);
    await insertAll(txDb, t.events, rows.events);
    await insertAll(txDb, t.memories, rows.memories);
    await insertAll(txDb, t.edges, rows.edges);
    await insertAll(txDb, t.volumes, rows.volumes);
    await insertAll(txDb, t.arcs, rows.arcs);
    await insertAll(txDb, t.eras, rows.eras);
    await insertAll(txDb, t.idRedirects, rows.idRedirects);
  });
}
