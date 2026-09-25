import type { DateRange, EdgeType, EntityKind, EventDateRef } from "@paths/shared";

/** When something is active. `null` means unbounded on that side. */
export interface Interval {
  start: DateRange | null;
  end: DateRange | null;
}

/**
 * A lifetime whose bounds may be revealed later than the entity itself: a death is often revealed
 * chapters after the character first appears. A bound the reader hasn't reached must not affect
 * anything they see, including when things are present in time (docs/model/spoilers.md §3).
 */
export interface Lifetime extends Interval {
  /** Chapter revealing the start bound; omitted means "revealed with the entity". */
  startRevealedIn?: number;
  /** Chapter revealing the end bound; omitted means "revealed with the entity". */
  endRevealedIn?: number;
}

export interface GraphNode {
  id: string;
  kind: EntityKind;
  revealedIn: number;
  lifetime: Lifetime;
  /** Order among events with the same date (docs/model/dates.md §4). */
  seq?: number;
  /** When a memory was originally experienced (its own date). */
  date?: DateRange;
}

export interface GraphEdge {
  /** The edge's stable ID, when it comes from the dataset. */
  id?: string;
  source: string;
  target: string;
  type: EdgeType;
  revealedIn: number;
  /**
   * The edge's own period: its `from`/`until`, or the moment of a killing. Revealed together with
   * the edge. When it's actually active also depends on its endpoints' lifetimes — see `activeAt`.
   */
  own: Interval;
  /**
   * The events `from`/`until` refer to, when they do. Dates are often known only to the year, so
   * two things in 850 overlap by date alone; the events' story order (`seq`) can still tell
   * whether a membership began before or after something else that year.
   */
  anchors?: { from?: EventDateRef; until?: EventDateRef };
}

export interface Adjacent {
  edge: GraphEdge;
  neighbor: string;
}

/**
 * An immutable graph. Traversals treat every edge as a connection in both directions;
 * `edge.source` / `edge.target` keep the original direction for display.
 */
export interface Graph {
  nodes: ReadonlyMap<string, GraphNode>;
  edges: readonly GraphEdge[];
  adjacency: ReadonlyMap<string, readonly Adjacent[]>;
}

export function createGraph(nodes: Iterable<GraphNode>, edges: Iterable<GraphEdge>): Graph {
  const nodeMap = new Map<string, GraphNode>();
  const adjacency = new Map<string, Adjacent[]>();
  for (const node of nodes) {
    if (nodeMap.has(node.id)) throw new Error(`Duplicate node: ${node.id}`);
    nodeMap.set(node.id, node);
    adjacency.set(node.id, []);
  }

  const edgeList: GraphEdge[] = [];
  for (const edge of edges) {
    const sourceAdjacent = adjacency.get(edge.source);
    const targetAdjacent = adjacency.get(edge.target);
    if (!sourceAdjacent || !targetAdjacent) {
      throw new Error(`Edge ${edge.source} -${edge.type}-> ${edge.target} has a missing endpoint`);
    }
    edgeList.push(edge);
    sourceAdjacent.push({ edge, neighbor: edge.target });
    if (edge.source !== edge.target) targetAdjacent.push({ edge, neighbor: edge.source });
  }

  return { nodes: nodeMap, edges: edgeList, adjacency };
}

export function neighborsOf(graph: Graph, id: string): readonly Adjacent[] {
  return graph.adjacency.get(id) ?? [];
}
