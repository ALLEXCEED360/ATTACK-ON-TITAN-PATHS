import type { ElementDefinition } from "cytoscape";
import type { Neighborhood } from "../../api/client";
import { edgeLabel } from "../../lib/format";

/**
 * Converts an API neighbourhood into Cytoscape elements. Pure, so it's easy to test.
 * `imageOf` gives a node's portrait, if the reader may see one (see art/manifest.ts).
 */
export function toElements(
  neighborhood: Neighborhood,
  imageOf: (id: string) => string | undefined = () => undefined,
): ElementDefinition[] {
  const nodes: ElementDefinition[] = neighborhood.nodes.map((node) => {
    const image = imageOf(node.id);
    return {
      group: "nodes",
      data: {
        id: node.id,
        label: node.name,
        kind: node.kind,
        depth: node.depth,
        image: image ?? "",
      },
      classes: [
        `kind-${node.kind}`,
        node.id === neighborhood.center ? "center" : "",
        node.uncertain ? "uncertain" : "",
        image ? "has-image" : "",
      ]
        .filter(Boolean)
        .join(" "),
    };
  });

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
