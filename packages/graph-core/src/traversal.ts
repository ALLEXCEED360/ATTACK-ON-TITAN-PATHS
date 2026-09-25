import { type Graph, neighborsOf } from "./graph.ts";

/** Breadth-first search: every node within `maxDepth` connections of `start`, with its depth. */
export function bfs(graph: Graph, start: string, maxDepth = Infinity): Map<string, number> {
  const depths = new Map<string, number>();
  if (!graph.nodes.has(start)) return depths;

  depths.set(start, 0);
  const queue = [start];
  // Iterating an array also visits items appended during the loop.
  for (const current of queue) {
    const depth = depths.get(current) ?? 0;
    if (depth >= maxDepth) continue;
    for (const { neighbor } of neighborsOf(graph, current)) {
      if (!depths.has(neighbor)) {
        depths.set(neighbor, depth + 1);
        queue.push(neighbor);
      }
    }
  }
  return depths;
}

/** Depth-first search: nodes reachable from `start`, in visiting order. */
export function dfs(graph: Graph, start: string): string[] {
  if (!graph.nodes.has(start)) return [];

  const visited = new Set<string>();
  const order: string[] = [];
  const stack = [start];
  for (let current = stack.pop(); current !== undefined; current = stack.pop()) {
    if (visited.has(current)) continue;
    visited.add(current);
    order.push(current);
    // Push in reverse so neighbours are visited in adjacency order.
    for (const { neighbor } of [...neighborsOf(graph, current)].reverse()) {
      if (!visited.has(neighbor)) stack.push(neighbor);
    }
  }
  return order;
}

/** Groups of nodes connected to each other, largest first. */
export function connectedComponents(graph: Graph): string[][] {
  const seen = new Set<string>();
  const components: string[][] = [];
  for (const id of graph.nodes.keys()) {
    if (seen.has(id)) continue;
    const component = [...bfs(graph, id).keys()];
    for (const member of component) seen.add(member);
    components.push(component);
  }
  return components.sort((a, b) => b.length - a.length);
}

/**
 * A directed cycle among the given edges, as a list of node IDs that starts and ends on the same
 * node, or `null` if there is none. Used to reject impossible data (e.g. `parent_of` loops).
 */
export function findDirectedCycle(
  edges: Iterable<{ source: string; target: string }>,
): string[] | null {
  const outgoing = new Map<string, string[]>();
  for (const { source, target } of edges) {
    const list = outgoing.get(source);
    if (list) list.push(target);
    else outgoing.set(source, [target]);
  }

  const state = new Map<string, "visiting" | "done">();
  const path: string[] = [];

  const visit = (node: string): string[] | null => {
    state.set(node, "visiting");
    path.push(node);
    for (const next of outgoing.get(node) ?? []) {
      const nextState = state.get(next);
      if (nextState === "visiting") return [...path.slice(path.indexOf(next)), next];
      if (nextState === undefined) {
        const cycle = visit(next);
        if (cycle) return cycle;
      }
    }
    path.pop();
    state.set(node, "done");
    return null;
  };

  for (const node of outgoing.keys()) {
    if (!state.has(node)) {
      const cycle = visit(node);
      if (cycle) return cycle;
    }
  }
  return null;
}
