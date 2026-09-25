import { sql } from "drizzle-orm";
import type { Db } from "./client.ts";
import { parseQuery } from "./search-query.ts";

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
 * Entities a reader at `cutoff` knows about, with each lifetime bound kept only if it's revealed
 * by then (docs/model/spoilers.md §3): an unrevealed death must not remove anyone from view.
 */
function readerLives(cutoff: number) {
  return sql`
    select id, kind,
      case when coalesce(life_start_revealed_in, 0) <= ${cutoff} then life_start_earliest end as start_earliest,
      case when coalesce(life_start_revealed_in, 0) <= ${cutoff} then life_start_latest end as start_latest,
      case when coalesce(life_end_revealed_in, 0) <= ${cutoff} then life_end_earliest end as end_earliest,
      case when coalesce(life_end_revealed_in, 0) <= ${cutoff} then life_end_latest end as end_latest
    from entities
    where revealed_in <= ${cutoff}
  `;
}

/**
 * Relationships a reader at `cutoff` knows about, each active during its own period clipped to
 * both endpoints' lives as known at that chapter (mirrors graph-core's `activeAt`). Needs a
 * `lives` CTE built from `readerLives`. greatest()/least() ignore nulls, i.e. unbounded sides.
 */
function readerEdges(cutoff: number) {
  return sql`
    select e.id, e.source_id, e.target_id, e.type,
      greatest(e.own_start_earliest, s.start_earliest, t.start_earliest) as start_earliest,
      greatest(e.own_start_latest, s.start_latest, t.start_latest) as start_latest,
      least(e.own_end_earliest, s.end_earliest, t.end_earliest) as end_earliest,
      least(e.own_end_latest, s.end_latest, t.end_latest) as end_latest
    from edges e
    join lives s on s.id = e.source_id
    join lives t on t.id = e.target_id
    where e.revealed_in <= ${cutoff}
  `;
}

/** SQL condition: the row (with start_earliest / end_latest) overlaps [from, to]. */
function overlaps(alias: string, from: number | null, to: number | null) {
  const a = sql.raw(alias);
  return sql`(${from}::int is null or (
    (${a}.start_earliest is null or ${a}.start_earliest <= ${to}::int)
    and (${a}.end_latest is null or ${a}.end_latest >= ${from}::int)
  ))`;
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
  const nodes = await db.execute<{ id: string; kind: string }>(sql`
    with lives as (${readerLives(cutoff)})
    select id, kind from lives l
    where ${overlaps("l", t, t)}
    order by id
  `);
  const edges = await db.execute<{
    id: string;
    sourceId: string;
    targetId: string;
    type: string;
  }>(sql`
    with
      lives as (${readerLives(cutoff)}),
      present as (select id from lives l where ${overlaps("l", t, t)}),
      links as (${readerEdges(cutoff)})
    select k.id, k.source_id as "sourceId", k.target_id as "targetId", k.type
    from links k
    join present s on s.id = k.source_id
    join present p on p.id = k.target_id
    where ${overlaps("k", t, t)}
    order by k.id
  `);
  return { nodes: [...nodes], edges: [...edges] };
}

export interface SearchResult {
  id: string;
  kind: string;
  /** The name the reader should see at this cutoff. */
  displayName: string;
  /**
   * Why it matched: its own name or spelling, a revealed description, a connected entity's
   * name, or (for a year alone) because it happened that year.
   */
  reason: "name" | "description" | "connection" | "year";
  /** The text that matched: a name, a description paragraph, or the connected entity's name. */
  detail: string;
  score: number;
}

export interface SearchResponse {
  terms: string[];
  year: number | null;
  results: SearchResult[];
}

/**
 * Multi-word, year-aware search (docs/decisions/0007-search.md). Every word must match the
 * entity's own names, one of its *revealed* description paragraphs, or the name of an entity
 * connected by a *revealed* relationship. A year keeps only what exists that year. Nothing past
 * the reader's cutoff takes part in matching (docs/model/spoilers.md §6).
 */
export async function search(
  db: Db,
  { q, cutoff, limit = 10 }: { q: string; cutoff: number; limit?: number },
): Promise<SearchResponse> {
  const { terms, year } = parseQuery(q);
  if (terms.length === 0 && year === null) return { terms, year, results: [] };

  const yearStart = year === null ? null : year * 10_000 + 101;
  const yearEnd = year === null ? null : year * 10_000 + 1231;
  const displayName = sql`(
    select d.name from entity_names d
    where d.entity_id = e.id and d.is_primary and d.revealed_in <= ${cutoff}
    order by d.position desc
    limit 1
  )`;
  // Entities the reader knows about that exist in the year (by *revealed* lifetimes).
  const visible = sql`
    select id, kind, start_earliest from lives l
    where ${overlaps("l", yearStart, yearEnd)}
  `;

  // A year on its own lists the events of that year, in order.
  if (terms.length === 0) {
    const rows = await db.execute<SearchResult & Record<string, unknown>>(sql`
      with lives as (${readerLives(cutoff)}), visible as (${visible})
      select e.id, e.kind, ${displayName} as "displayName",
             'year' as reason, ${String(year)} as detail, 1::real as score
      from visible v
      join entities e on e.id = v.id
      join events ev on ev.entity_id = e.id
      where v.kind = 'event'
      order by v.start_earliest, ev.seq nulls last, e.id
      limit ${limit}
    `);
    return { terms, year, results: [...rows] };
  }

  const rows = await db.execute<SearchResult & Record<string, unknown>>(sql`
    with
      lives as (${readerLives(cutoff)}),
      visible as (${visible}),
      terms as (
        select term, ord
        from jsonb_array_elements_text(${JSON.stringify(terms)}::jsonb) with ordinality as t(term, ord)
      ),
      names as (
        select n.entity_id, n.name
        from entity_names n
        join entities e on e.id = n.entity_id
        where n.revealed_in <= ${cutoff} and e.revealed_in <= ${cutoff}
      ),
      links as (
        -- With a year, only relationships that exist that year, as far as the reader knows.
        select k.source_id as a, k.target_id as b
        from (${readerEdges(cutoff)}) k
        where ${overlaps("k", yearStart, yearEnd)}
      ),
      hits as (
        select t.ord, n.entity_id, 'name' as reason, n.name as detail,
               greatest(
                 similarity(lower(n.name), t.term),
                 case when lower(n.name) like '%' || t.term || '%' then 1 else 0 end
               ) as score
        from terms t
        join names n on lower(n.name) % t.term or lower(n.name) like '%' || t.term || '%'
        union all
        select t.ord, s.entity_id, 'description', s.text, 0.6
        from terms t
        join description_segments s on s.search @@ to_tsquery('english', t.term || ':*')
        where s.revealed_in <= ${cutoff}
        union all
        select t.ord, l.b, 'connection', n.name, 0.4
        from terms t
        join names n on lower(n.name) like '%' || t.term || '%'
        join (select a, b from links union all select b, a from links) l on l.a = n.entity_id
      ),
      per_term as (
        select h.entity_id, h.ord, max(h.score) as score
        from hits h
        join visible v on v.id = h.entity_id
        group by h.entity_id, h.ord
      ),
      qualified as (
        select entity_id, sum(score) as total
        from per_term
        group by entity_id
        having count(*) = (select count(*) from terms)
      ),
      best as (
        select distinct on (h.entity_id) h.entity_id, h.reason, h.detail
        from hits h
        join qualified q on q.entity_id = h.entity_id
        order by h.entity_id,
                 case h.reason when 'name' then 0 when 'description' then 1 else 2 end,
                 h.score desc,
                 h.detail
      )
    select e.id, e.kind, ${displayName} as "displayName",
           best.reason, best.detail, q.total::real as score
    from qualified q
    join best on best.entity_id = q.entity_id
    join entities e on e.id = q.entity_id
    order by q.total desc, e.id
    limit ${limit}
  `);
  return { terms, year, results: [...rows] };
}
