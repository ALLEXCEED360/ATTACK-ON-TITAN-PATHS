import { EDGE_TYPES, type EdgeCategory, type EdgeType } from "@paths/shared";
import { type Graph, type GraphEdge, neighborsOf } from "./graph.ts";

export interface PathOptions {
  /** Nodes the path may not pass through (the endpoints are always allowed). */
  excludeNodes?: ReadonlySet<string>;
  excludeTypes?: ReadonlySet<EdgeType>;
  excludeCategories?: ReadonlySet<EdgeCategory>;
}

export interface PathResult {
  nodes: string[];
  edges: GraphEdge[];
  cost: number;
}

/**
 * The lowest-cost connection between two nodes, using the edge-type weights from
 * docs/model/relationships.md §6 (Dijkstra's algorithm). Returns `null` if they aren't connected.
 */
export function shortestPath(
  graph: Graph,
  from: string,
  to: string,
  options: PathOptions = {},
): PathResult | null {
  if (!graph.nodes.has(from) || !graph.nodes.has(to)) return null;
  const { excludeNodes, excludeTypes, excludeCategories } = options;

  const cost = new Map<string, number>([[from, 0]]);
  const via = new Map<string, { previous: string; edge: GraphEdge }>();
  const done = new Set<string>();
  const queue = new MinHeap();
  queue.push(from, 0);

  for (let entry = queue.pop(); entry; entry = queue.pop()) {
    const { id: current, priority } = entry;
    if (done.has(current)) continue;
    done.add(current);
    if (current === to) break;

    for (const { edge, neighbor } of neighborsOf(graph, current)) {
      if (done.has(neighbor)) continue;
      if (neighbor !== to && excludeNodes?.has(neighbor)) continue;
      const definition = EDGE_TYPES[edge.type];
      if (excludeTypes?.has(edge.type) || excludeCategories?.has(definition.category)) continue;

      const next = priority + definition.weight;
      if (next < (cost.get(neighbor) ?? Infinity)) {
        cost.set(neighbor, next);
        via.set(neighbor, { previous: current, edge });
        queue.push(neighbor, next);
      }
    }
  }

  const total = cost.get(to);
  if (total === undefined) return null;

  const nodes = [to];
  const edges: GraphEdge[] = [];
  for (let step = via.get(to); step; step = via.get(step.previous)) {
    nodes.push(step.previous);
    edges.push(step.edge);
  }
  return { nodes: nodes.reverse(), edges: edges.reverse(), cost: total };
}

interface HeapItem {
  id: string;
  priority: number;
}

/** A binary min-heap of (id, priority) pairs. */
class MinHeap {
  private readonly items: HeapItem[] = [];

  push(id: string, priority: number): void {
    this.items.push({ id, priority });
    let i = this.items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.priorityAt(parent) <= priority) break;
      this.swap(i, parent);
      i = parent;
    }
  }

  pop(): HeapItem | undefined {
    const top = this.items[0];
    const last = this.items.pop();
    if (top === undefined || last === undefined) return undefined;
    if (this.items.length === 0) return top;

    this.items[0] = last;
    let i = 0;
    for (;;) {
      const left = 2 * i + 1;
      const right = left + 1;
      let smallest = i;
      if (left < this.items.length && this.priorityAt(left) < this.priorityAt(smallest)) {
        smallest = left;
      }
      if (right < this.items.length && this.priorityAt(right) < this.priorityAt(smallest)) {
        smallest = right;
      }
      if (smallest === i) return top;
      this.swap(i, smallest);
      i = smallest;
    }
  }

  private priorityAt(i: number): number {
    return this.items[i]?.priority ?? Infinity;
  }

  private swap(i: number, j: number): void {
    const a = this.items[i];
    const b = this.items[j];
    if (a === undefined || b === undefined) return;
    this.items[i] = b;
    this.items[j] = a;
  }
}
