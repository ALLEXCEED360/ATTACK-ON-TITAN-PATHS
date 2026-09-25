import type { Core } from "cytoscape";

// "Everything unrelated fades" (blueprint §14). Pure Cytoscape operations, testable headless.

/** Highlights a node with its direct connections and fades everything else. */
export function highlight(cy: Core, id: string): void {
  const node = cy.getElementById(id);
  if (node.empty()) {
    clearHighlight(cy);
    return;
  }
  const related = node.closedNeighborhood();
  cy.batch(() => {
    cy.elements().addClass("faded").removeClass("highlighted");
    related.removeClass("faded").addClass("highlighted");
  });
}

export function clearHighlight(cy: Core): void {
  cy.batch(() => {
    cy.elements().removeClass("faded highlighted");
  });
}
