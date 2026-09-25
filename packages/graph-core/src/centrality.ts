import { type Graph, neighborsOf } from "./graph.ts";

// Graph metrics — presented as metrics, never as "importance" rankings.

/** Number of connections per node. */
export function degreeCentrality(graph: Graph): Map<string, number> {
  const degrees = new Map<string, number>();
  for (const [id, adjacent] of graph.adjacency) degrees.set(id, adjacent.length);
  return degrees;
}

/**
 * Betweenness centrality (Brandes' algorithm, unweighted, undirected): how many shortest paths
 * between other nodes pass through each node.
 */
export function betweennessCentrality(graph: Graph): Map<string, number> {
  const scores = new Map<string, number>();
  for (const id of graph.nodes.keys()) scores.set(id, 0);

  for (const source of graph.nodes.keys()) {
    const order: string[] = [];
    const predecessors = new Map<string, string[]>();
    const pathCounts = new Map<string, number>([[source, 1]]);
    const distance = new Map<string, number>([[source, 0]]);

    const queue = [source];
    for (const current of queue) {
      order.push(current);
      const currentDistance = distance.get(current) ?? 0;
      // Parallel edges (two relationships between the same pair) count as one connection.
      for (const neighbor of new Set(neighborsOf(graph, current).map((a) => a.neighbor))) {
        if (!distance.has(neighbor)) {
          distance.set(neighbor, currentDistance + 1);
          queue.push(neighbor);
        }
        if (distance.get(neighbor) === currentDistance + 1) {
          pathCounts.set(
            neighbor,
            (pathCounts.get(neighbor) ?? 0) + (pathCounts.get(current) ?? 0),
          );
          const list = predecessors.get(neighbor);
          if (list) list.push(current);
          else predecessors.set(neighbor, [current]);
        }
      }
    }

    const dependency = new Map<string, number>();
    for (const node of order.reverse()) {
      for (const predecessor of predecessors.get(node) ?? []) {
        const share =
          ((pathCounts.get(predecessor) ?? 0) / (pathCounts.get(node) ?? 1)) *
          (1 + (dependency.get(node) ?? 0));
        dependency.set(predecessor, (dependency.get(predecessor) ?? 0) + share);
      }
      if (node !== source) scores.set(node, (scores.get(node) ?? 0) + (dependency.get(node) ?? 0));
    }
  }

  // Each undirected path was counted from both ends.
  for (const [id, score] of scores) scores.set(id, score / 2);
  return scores;
}
