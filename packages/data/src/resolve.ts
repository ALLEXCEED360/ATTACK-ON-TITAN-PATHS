import type { GraphEdge, GraphNode, Interval } from "@paths/graph-core";
import {
  type DateRange,
  type DateRef,
  EDGE_TYPES,
  type Edge,
  type Entity,
  resolveDate,
} from "@paths/shared";
import type { Issue } from "./issues.ts";
import type { Dataset, LoadedEdge } from "./load.ts";

// Turns dates and event references into concrete time ranges (docs/model/dates.md §6–7).

const ALWAYS: Interval = { start: null, end: null };

/** When an entity exists in world time. */
export function lifetimeOf(entity: Entity): Interval {
  switch (entity.kind) {
    case "character":
      return {
        start: entity.born ? resolveDate(entity.born.date) : null,
        end: entity.died ? resolveDate(entity.died.date) : null,
      };
    case "event":
      return {
        start: resolveDate(entity.start.date),
        end: resolveDate((entity.end ?? entity.start).date),
      };
    // A memory can be received before it is experienced, so it isn't bound to its own date.
    case "memory":
    case "titan":
    case "location":
    case "faction":
      return ALWAYS;
  }
}

/** An edge's own `from` / `until`, for the types that have them. */
export function timeRefsOf(edge: Edge): {
  from?: DateRef | undefined;
  until?: DateRef | undefined;
} {
  return "from" in edge ? { from: edge.from, until: edge.until } : {};
}

/** The `from` / `until` fields an edge actually sets. */
export function timeRefEntries(edge: Edge): ["from" | "until", DateRef][] {
  const { from, until } = timeRefsOf(edge);
  const entries: ["from" | "until", DateRef][] = [];
  if (from) entries.push(["from", from]);
  if (until) entries.push(["until", until]);
  return entries;
}

/** Resolves a date or event reference; `undefined` if it points at a missing event. */
export function resolveDateRef(dataset: Dataset, ref: DateRef): DateRange | undefined {
  if (!("event" in ref)) return resolveDate(ref);
  const loaded = dataset.entities.get(ref.event);
  if (loaded?.entity.kind !== "event") return undefined;
  const { start, end } = loaded.entity;
  return resolveDate((ref.at === "end" ? (end ?? start) : start).date);
}

function later(a: DateRange | null, b: DateRange | null): DateRange | null {
  if (!a) return b;
  if (!b) return a;
  return { earliest: Math.max(a.earliest, b.earliest), latest: Math.max(a.latest, b.latest) };
}

function sooner(a: DateRange | null, b: DateRange | null): DateRange | null {
  if (!a) return b;
  if (!b) return a;
  return { earliest: Math.min(a.earliest, b.earliest), latest: Math.min(a.latest, b.latest) };
}

export function isEmpty(interval: Interval): boolean {
  return (
    interval.start !== null &&
    interval.end !== null &&
    interval.start.earliest > interval.end.latest
  );
}

/**
 * When a `killed` edge happens: the event it happened in, or else the victim's death. A killing
 * is a moment, not a relationship that lasts while both are alive (docs/model/dates.md §7).
 */
function killingMoment(dataset: Dataset, edge: Edge): Interval | null {
  if (edge.type !== "killed") return null;
  const event = edge.in ? dataset.entities.get(edge.in)?.entity : undefined;
  if (event) return lifetimeOf(event);
  const victim = dataset.entities.get(edge.target)?.entity;
  if (victim?.kind === "character" && victim.died) {
    const death = resolveDate(victim.died.date);
    return { start: death, end: death };
  }
  return null;
}

/** An edge's active period: its own `from`/`until`, clipped to both endpoints' lifetimes. */
export function activeInterval(dataset: Dataset, loaded: LoadedEdge): Interval {
  const { edge } = loaded;
  const source = dataset.entities.get(edge.source)?.entity;
  const target = dataset.entities.get(edge.target)?.entity;
  const { from, until } = timeRefsOf(edge);
  const own: Interval = killingMoment(dataset, edge) ?? {
    start: from ? (resolveDateRef(dataset, from) ?? null) : null,
    end: until ? (resolveDateRef(dataset, until) ?? null) : null,
  };
  const sourceLife = source ? lifetimeOf(source) : ALWAYS;
  const targetLife = target ? lifetimeOf(target) : ALWAYS;
  return {
    start: later(later(own.start, sourceLife.start), targetLife.start),
    end: sooner(sooner(own.end, sourceLife.end), targetLife.end),
  };
}

/** The dataset as graph nodes and edges, ready for `createGraph`. Assumes it has been validated. */
export function toGraphInput(dataset: Dataset): {
  nodes: GraphNode[];
  edges: GraphEdge[];
  issues: Issue[];
} {
  const issues: Issue[] = [];
  const nodes: GraphNode[] = [...dataset.entities.values()].map(({ entity }) => ({
    id: entity.id,
    kind: entity.kind,
    revealedIn: entity.revealedIn,
    lifetime: lifetimeOf(entity),
  }));

  const edges: GraphEdge[] = [];
  for (const loaded of dataset.edges) {
    const { edge } = loaded;
    if (!dataset.entities.has(edge.target)) continue; // reported by validateDataset
    const active = activeInterval(dataset, loaded);
    const { from, until } = timeRefsOf(edge);
    const explicitTime = from !== undefined || until !== undefined;
    // Untimed types (e.g. `caused` between two events) may legitimately never coexist in time;
    // explicit dates that contradict the endpoints' lifetimes are an authoring mistake.
    if (isEmpty(active) && EDGE_TYPES[edge.type].timeBounded && explicitTime) {
      issues.push({
        level: "error",
        file: loaded.file,
        path: `edges[${String(loaded.index)}]`,
        message: "`from`/`until` fall outside the lifetimes of the edge's endpoints",
      });
    }
    edges.push({
      source: edge.source,
      target: edge.target,
      type: edge.type,
      revealedIn: edge.revealedIn,
      active,
    });
  }

  return { nodes, edges, issues };
}
