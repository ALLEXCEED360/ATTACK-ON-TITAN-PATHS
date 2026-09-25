import { type Graph, type GraphEdge, type Interval, createGraph } from "./graph.ts";

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
 */
export function viewGraph(graph: Graph, { cutoff, at }: ViewOptions): GraphView {
  const uncertainNodes = new Set<string>();
  const uncertainEdges = new Set<GraphEdge>();

  const nodes = [...graph.nodes.values()].filter((node) => {
    if (node.revealedIn > cutoff) return false;
    if (at === undefined) return true;
    const presence = presenceAt(node.lifetime, at);
    if (presence === "uncertain") uncertainNodes.add(node.id);
    return presence !== "absent";
  });
  const kept = new Set(nodes.map((node) => node.id));

  const edges = graph.edges.filter((edge) => {
    if (edge.revealedIn > cutoff || !kept.has(edge.source) || !kept.has(edge.target)) return false;
    if (at === undefined) return true;
    const presence = presenceAt(edge.active, at);
    if (presence === "uncertain") uncertainEdges.add(edge);
    return presence !== "absent";
  });

  return { graph: createGraph(nodes, edges), uncertainNodes, uncertainEdges };
}
