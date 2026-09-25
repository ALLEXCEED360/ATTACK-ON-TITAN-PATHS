import { sql } from "drizzle-orm";
import type { Db } from "./client.ts";

// Spoiler-aware queries written in SQL. Each mirrors a graph-core function, and the tests check
// that both give the same answers on the real dataset.

/**
 * Everything within `depth` connections of `id`, as seen by a reader at `cutoff`
 * (mirrors graph-core's `bfs` on `viewGraph`). A recursive CTE walks the edges in both directions.
 */
export async function neighborhood(
  db: Db,
  { id, depth, cutoff }: { id: string; depth: number; cutoff: number },
): Promise<Map<string, number>> {
  const rows = await db.execute<{ id: string; depth: number }>(sql`
    with recursive
      visible as (
        select id from entities where revealed_in <= ${cutoff}
      ),
      links as (
        select e.source_id as a, e.target_id as b
        from edges e
        join visible s on s.id = e.source_id
        join visible t on t.id = e.target_id
        where e.revealed_in <= ${cutoff}
      ),
      adjacency as (
        select a, b from links
        union
        select b, a from links
      ),
      walk (id, depth) as (
        select id, 0 from visible where id = ${id}
        union
        select adjacency.b, walk.depth + 1
        from walk
        join adjacency on adjacency.a = walk.id
        where walk.depth < ${depth}
      )
    select id, min(depth)::int as depth
    from walk
    group by id
  `);
  return new Map(rows.map((row) => [row.id, row.depth]));
}

export interface GraphAtResult {
  nodes: { id: string; kind: string }[];
  edges: { id: string; sourceId: string; targetId: string; type: string }[];
}

/**
 * The graph a reader at `cutoff` sees at world moment `at` (mirrors graph-core's `viewGraph`,
 * docs/model/dates.md §8). Omit `at` to ignore world time.
 */
export async function graphAt(
  db: Db,
  { cutoff, at }: { cutoff: number; at?: number | undefined },
): Promise<GraphAtResult> {
  const t = at ?? null;
  const visibleNodes = sql`
    select id, kind
    from entities
    where revealed_in <= ${cutoff}
      and (${t}::int is null or (
        (life_start_earliest is null or life_start_earliest <= ${t})
        and (life_end_latest is null or life_end_latest >= ${t})
      ))
  `;
  const nodes = await db.execute<{ id: string; kind: string }>(sql`${visibleNodes} order by id`);
  const edges = await db.execute<{
    id: string;
    sourceId: string;
    targetId: string;
    type: string;
  }>(sql`
    with visible as (${visibleNodes})
    select e.id, e.source_id as "sourceId", e.target_id as "targetId", e.type
    from edges e
    join visible s on s.id = e.source_id
    join visible v on v.id = e.target_id
    where e.revealed_in <= ${cutoff}
      and (${t}::int is null or (
        (e.active_start_earliest is null or e.active_start_earliest <= ${t})
        and (e.active_end_latest is null or e.active_end_latest >= ${t})
      ))
    order by e.id
  `);
  return { nodes: [...nodes], edges: [...edges] };
}

export interface SearchResult {
  id: string;
  kind: string;
  /** The name the reader should see at this cutoff. */
  displayName: string;
  /** The (possibly variant) name that matched. */
  matched: string;
  score: number;
}

/**
 * Fuzzy name search over revealed names and spellings only (docs/model/spoilers.md §6).
 * Trigram similarity handles misspellings; a substring match always counts.
 */
export async function searchNames(
  db: Db,
  { q, cutoff, limit = 10 }: { q: string; cutoff: number; limit?: number },
): Promise<SearchResult[]> {
  const query = q.trim().toLowerCase();
  if (query === "") return [];
  const rows = await db.execute<SearchResult & Record<string, unknown>>(sql`
    with matches as (
      select
        n.entity_id,
        n.name,
        greatest(
          similarity(lower(n.name), ${query}),
          case when lower(n.name) like '%' || ${query} || '%' then 1 else 0 end
        ) as score
      from entity_names n
      join entities e on e.id = n.entity_id
      where n.revealed_in <= ${cutoff}
        and e.revealed_in <= ${cutoff}
        and (lower(n.name) % ${query} or lower(n.name) like '%' || ${query} || '%')
    ),
    best as (
      select distinct on (entity_id) entity_id, name as matched, score
      from matches
      order by entity_id, score desc, name
    )
    select
      e.id,
      e.kind,
      (
        select d.name from entity_names d
        where d.entity_id = e.id and d.is_primary and d.revealed_in <= ${cutoff}
        order by d.position desc
        limit 1
      ) as "displayName",
      best.matched,
      best.score::real as score
    from best
    join entities e on e.id = best.entity_id
    order by best.score desc, e.id
    limit ${limit}
  `);
  return [...rows];
}
