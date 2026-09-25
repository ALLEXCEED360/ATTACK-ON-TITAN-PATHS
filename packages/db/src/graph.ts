import type { GraphEdge, GraphNode, Interval, Lifetime } from "@paths/graph-core";
import { type DateRange, type Name, edgeAnchors, resolveDate } from "@paths/shared";
import { asc, eq } from "drizzle-orm";
import type { Db } from "./client.ts";
import * as t from "./schema.ts";

// Loads the graph structure and display names into memory. The data only changes when the
// database is reseeded, so a server can load this once at startup.

function interval(
  startEarliest: number | null,
  startLatest: number | null,
  endEarliest: number | null,
  endLatest: number | null,
): Interval {
  return {
    start:
      startEarliest === null || startLatest === null
        ? null
        : { earliest: startEarliest, latest: startLatest },
    end:
      endEarliest === null || endLatest === null
        ? null
        : { earliest: endEarliest, latest: endLatest },
  };
}

export async function loadGraphInput(db: Db): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  const entityRows = await db.select().from(t.entities).orderBy(asc(t.entities.id));
  const edgeRows = await db.select().from(t.edges).orderBy(asc(t.edges.id));
  const seqs = new Map(
    (await db.select({ id: t.events.entityId, seq: t.events.seq }).from(t.events)).map((r) => [
      r.id,
      r.seq,
    ]),
  );
  const memoryDates = new Map<string, DateRange>(
    (await db.select().from(t.memories)).map((r) => [
      r.entityId,
      resolveDate(r.start.date as Parameters<typeof resolveDate>[0]),
    ]),
  );

  return {
    nodes: entityRows.map((row) => {
      const lifetime: Lifetime = {
        ...interval(
          row.lifeStartEarliest,
          row.lifeStartLatest,
          row.lifeEndEarliest,
          row.lifeEndLatest,
        ),
        ...(row.lifeStartRevealedIn === null ? {} : { startRevealedIn: row.lifeStartRevealedIn }),
        ...(row.lifeEndRevealedIn === null ? {} : { endRevealedIn: row.lifeEndRevealedIn }),
      };
      const seq = seqs.get(row.id);
      const date = memoryDates.get(row.id);
      return {
        id: row.id,
        kind: row.kind,
        revealedIn: row.revealedIn,
        lifetime,
        ...(seq === undefined || seq === null ? {} : { seq }),
        ...(date ? { date } : {}),
      };
    }),
    edges: edgeRows.map((row) => {
      const anchors = edgeAnchors(row.fromRef, row.untilRef);
      return {
        id: row.id,
        source: row.sourceId,
        target: row.targetId,
        type: row.type,
        revealedIn: row.revealedIn,
        own: interval(
          row.ownStartEarliest,
          row.ownStartLatest,
          row.ownEndEarliest,
          row.ownEndLatest,
        ),
        ...(anchors ? { anchors } : {}),
      };
    }),
  };
}

/** Every entity's primary names in order, for `displayName` from @paths/shared. */
export async function loadDisplayNames(db: Db): Promise<Map<string, Name[]>> {
  const rows = await db
    .select({
      entityId: t.entityNames.entityId,
      name: t.entityNames.name,
      revealedIn: t.entityNames.revealedIn,
    })
    .from(t.entityNames)
    .where(eq(t.entityNames.isPrimary, true))
    .orderBy(asc(t.entityNames.entityId), asc(t.entityNames.position));

  const names = new Map<string, Name[]>();
  for (const row of rows) {
    const list = names.get(row.entityId) ?? [];
    list.push({ name: row.name, revealedIn: row.revealedIn });
    names.set(row.entityId, list);
  }
  return names;
}
