import type { GraphEdge, GraphNode, Interval } from "@paths/graph-core";
import type { Name } from "@paths/shared";
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

  return {
    nodes: entityRows.map((row) => ({
      id: row.id,
      kind: row.kind,
      revealedIn: row.revealedIn,
      lifetime: interval(
        row.lifeStartEarliest,
        row.lifeStartLatest,
        row.lifeEndEarliest,
        row.lifeEndLatest,
      ),
    })),
    edges: edgeRows.map((row) => ({
      id: row.id,
      source: row.sourceId,
      target: row.targetId,
      type: row.type,
      revealedIn: row.revealedIn,
      active: interval(
        row.activeStartEarliest,
        row.activeStartLatest,
        row.activeEndEarliest,
        row.activeEndLatest,
      ),
    })),
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
