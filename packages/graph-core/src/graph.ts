import type { DateRange, EdgeType, EntityKind } from "@paths/shared";

/** When something is active. `null` means unbounded on that side. */
export interface Interval {
  start: DateRange | null;
  end: DateRange | null;
}

export interface GraphNode {
  id: string;
  kind: EntityKind;
  revealedIn: number;
  lifetime: Interval;
}

export interface GraphEdge {
  /** The edge's stable ID, when it comes from the dataset. */
  id?: string;
  source: string;
  target: string;
  type: EdgeType;
  revealedIn: number;
  active: Interval;
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
