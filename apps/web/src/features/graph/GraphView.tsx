import cytoscape, { type Core, type LayoutOptions } from "cytoscape";
import fcose from "cytoscape-fcose";
import { useEffect, useRef } from "react";
import type { Neighborhood } from "../../api/client";
import { toElements } from "./elements";
import { clearHighlight, highlight } from "./focus";
import { graphStyle, readPalette } from "./style";

cytoscape.use(fcose);

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * `randomize` gives the first layout a fresh start. Later layouts keep existing positions, so the
 * graph moves smoothly instead of reshuffling.
 */
/** Fitting a small graph shouldn't blow it up; readers can still zoom in further themselves. */
const MAX_FIT_ZOOM = 1.4;

function runLayout(cy: Core, { animate, randomize }: { animate: boolean; randomize: boolean }) {
  cy.one("layoutstop", () => {
    if (cy.zoom() > MAX_FIT_ZOOM) {
      cy.zoom(MAX_FIT_ZOOM);
      cy.center();
    }
  });
  cy.layout({
    name: "fcose",
    animate,
    animationDuration: 500,
    randomize,
    fit: true,
    padding: 40,
    nodeRepulsion: () => 7000,
    idealEdgeLength: () => 90,
  } as LayoutOptions).run();
}

interface GraphViewProps {
  neighborhood: Neighborhood;
  onSelect: (id: string) => void;
}

/**
 * The interactive graph. One Cytoscape instance lives for the component's lifetime; when the
 * data changes, elements are diffed in place so nodes keep their positions and glide to new ones.
 */
export function GraphView({ neighborhood, onSelect }: GraphViewProps) {
  const container = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const onSelectRef = useRef(onSelect);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    const cy = cytoscape({
      container: container.current,
      style: graphStyle(readPalette()),
      minZoom: 0.2,
      maxZoom: 3,
      boxSelectionEnabled: false,
    });
    cy.on("tap", "node", (event) => {
      onSelectRef.current((event.target as cytoscape.NodeSingular).id());
    });
    cy.on("mouseover", "node", (event) => {
      highlight(cy, (event.target as cytoscape.NodeSingular).id());
      if (container.current) container.current.style.cursor = "pointer";
    });
    cy.on("mouseout", "node", () => {
      clearHighlight(cy);
      if (container.current) container.current.style.cursor = "";
    });
    cyRef.current = cy;
    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, []);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    const next = toElements(neighborhood);
    const ids = new Set(next.map((element) => element.data.id));
    const isFirstRender = cy.elements().empty();

    cy.batch(() => {
      cy.elements()
        .filter((element) => !ids.has(element.id()))
        .remove();
      // New nodes start scattered around the centre node, so they fan out from it. (Nodes
      // stacked on exactly the same point can't be pulled apart by a force layout.)
      const origin = cy.getElementById(neighborhood.center);
      const start = origin.nonempty() ? { ...origin.position() } : { x: 0, y: 0 };
      for (const definition of next) {
        const id = definition.data.id ?? "";
        const existing = cy.getElementById(id);
        if (existing.nonempty()) {
          existing.data(definition.data);
          existing.classes(definition.classes ?? "");
        } else if (definition.group === "nodes") {
          const angle = Math.random() * 2 * Math.PI;
          const position = { x: start.x + 40 * Math.cos(angle), y: start.y + 40 * Math.sin(angle) };
          cy.add({ ...definition, position });
        } else {
          cy.add(definition);
        }
      }
    });

    runLayout(cy, {
      animate: !isFirstRender && !prefersReducedMotion(),
      randomize: isFirstRender,
    });
  }, [neighborhood]);

  const zoomBy = (factor: number) => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.animate({
      zoom: {
        level: cy.zoom() * factor,
        renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 },
      },
      duration: prefersReducedMotion() ? 0 : 150,
    });
  };

  const buttonClass =
    "size-8 rounded border border-charcoal-600 bg-charcoal-900 text-parchment-300 hover:border-brass-500";

  return (
    <div className="relative overflow-hidden rounded-lg border border-charcoal-700 bg-charcoal-900">
      <div
        ref={container}
        className="h-[60vh] min-h-80 w-full"
        role="img"
        aria-label={`Graph of ${String(neighborhood.nodes.length)} entities and ${String(neighborhood.edges.length)} connections. Switch to the list view for a text version.`}
      />
      <div className="absolute top-2 right-2 flex flex-col gap-1">
        <button
          type="button"
          aria-label="Zoom in"
          className={buttonClass}
          onClick={() => {
            zoomBy(1.3);
          }}
        >
          +
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          className={buttonClass}
          onClick={() => {
            zoomBy(1 / 1.3);
          }}
        >
          −
        </button>
        <button
          type="button"
          aria-label="Fit to view"
          className={buttonClass}
          onClick={() =>
            cyRef.current?.animate({
              fit: { eles: cyRef.current.elements(), padding: 40 },
              duration: prefersReducedMotion() ? 0 : 250,
            })
          }
        >
          ⤢
        </button>
      </div>
    </div>
  );
}
