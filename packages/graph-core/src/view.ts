import type { DateRange } from "@paths/shared";
import { type Graph, type GraphEdge, type GraphNode, type Interval, createGraph } from "./graph.ts";

export type Presence = "absent" | "certain" | "uncertain";

/**
 * Whether an interval includes moment `t` (a bound from `encodeBound`), per docs/model/dates.md §8:
 * present if `start.earliest ≤ t ≤ end.latest`, uncertain inside either fuzzy edge.
 */
export function presenceAt(interval: Interval, t: number): Presence {
  const { start, end } = interval;
  if (start && t < start.earliest) return "absent";
  if (end && t > end.latest) return "absent";
  if (start && t < start.latest) return "uncertain";
  if (end && t > end.earliest) return "uncertain";
  return "certain";
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

/** The overlap of several intervals (null bounds are unbounded). */
export function intersect(...intervals: Interval[]): Interval {
  return intervals.reduce<Interval>(
    (acc, interval) => ({
      start: later(acc.start, interval.start),
      end: sooner(acc.end, interval.end),
    }),
    { start: null, end: null },
  );
}

/** A node's lifetime as known at `cutoff`: bounds revealed later count as unknown. */
export function lifetimeAt(node: GraphNode, cutoff: number): Interval {
  const { lifetime } = node;
  return {
    start: (lifetime.startRevealedIn ?? 0) <= cutoff ? lifetime.start : null,
    end: (lifetime.endRevealedIn ?? 0) <= cutoff ? lifetime.end : null,
  };
}

/** When an edge is active, as known at `cutoff`: its own period within both endpoints' lives. */
export function activeAt(graph: Graph, edge: GraphEdge, cutoff: number): Interval {
  const source = graph.nodes.get(edge.source);
  const target = graph.nodes.get(edge.target);
  return intersect(
    edge.own,
    source ? lifetimeAt(source, cutoff) : { start: null, end: null },
    target ? lifetimeAt(target, cutoff) : { start: null, end: null },
  );
}

export interface ViewOptions {
  /** The reader's spoiler cutoff: only things revealed by this chapter are kept. */
  cutoff: number;
  /** A moment in world time (from `encodeBound`); omit to ignore time. */
  at?: number;
}

export interface GraphView {
  graph: Graph;
  uncertainNodes: ReadonlySet<string>;
  uncertainEdges: ReadonlySet<GraphEdge>;
}

/**
 * The graph as a reader at `cutoff` sees it at moment `at`. Everything past the cutoff is
 * absent — not hidden (docs/model/spoilers.md §6) — so algorithms run on the result are safe.
 * That includes time: an unrevealed death never makes someone disappear from the graph.
 */
export function viewGraph(graph: Graph, { cutoff, at }: ViewOptions): GraphView {
  const uncertainNodes = new Set<string>();
  const uncertainEdges = new Set<GraphEdge>();

  const nodes = [...graph.nodes.values()]
    .filter((node) => {
      if (node.revealedIn > cutoff) return false;
      if (at === undefined) return true;
      const presence = presenceAt(lifetimeAt(node, cutoff), at);
      if (presence === "uncertain") uncertainNodes.add(node.id);
      return presence !== "absent";
    })
    // Hand on only what the reader may know, so nothing downstream can use a hidden date.
    .map((node) => ({ ...node, lifetime: lifetimeAt(node, cutoff) }));
  const kept = new Set(nodes.map((node) => node.id));

  const edges = graph.edges.filter((edge) => {
    if (edge.revealedIn > cutoff || !kept.has(edge.source) || !kept.has(edge.target)) return false;
    if (at === undefined) return true;
    const presence = presenceAt(activeAt(graph, edge, cutoff), at);
    if (presence === "uncertain") uncertainEdges.add(edge);
    return presence !== "absent";
  });

  return { graph: createGraph(nodes, edges), uncertainNodes, uncertainEdges };
}
