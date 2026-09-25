import type { ElementDefinition } from "cytoscape";
import type { Neighborhood } from "../../api/client";
import { edgeLabel } from "../../lib/format";

/** Converts an API neighbourhood into Cytoscape elements. Pure, so it's easy to test. */
export function toElements(neighborhood: Neighborhood): ElementDefinition[] {
  const nodes: ElementDefinition[] = neighborhood.nodes.map((node) => ({
    group: "nodes",
    data: {
      id: node.id,
      label: node.name,
      kind: node.kind,
      depth: node.depth,
    },
    classes: [
      `kind-${node.kind}`,
      node.id === neighborhood.center ? "center" : "",
      node.uncertain ? "uncertain" : "",
    ]
      .filter(Boolean)
      .join(" "),
  }));

  const edges: ElementDefinition[] = neighborhood.edges.map((edge) => ({
    group: "edges",
    data: {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.type,
      category: edge.category,
      label: edgeLabel(edge.type, true),
    },
    classes: [`category-${edge.category}`, edge.uncertain ? "uncertain" : ""]
      .filter(Boolean)
      .join(" "),
  }));

  return [...nodes, ...edges];
}
