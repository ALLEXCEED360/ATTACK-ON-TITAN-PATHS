import type { StylesheetJson } from "cytoscape";
import type { EntityKind } from "../../api/client";

// The graph's look, drawn from the same CSS colour tokens as the rest of the app (styles.css).
// Kind is shown by shape *and* colour, so it never relies on colour alone.

export const KIND_SHAPES: Record<EntityKind, string> = {
  character: "ellipse",
  event: "diamond",
  titan: "hexagon",
  location: "round-rectangle",
  faction: "octagon",
  memory: "star",
  arc: "rectangle",
};

type Palette = Record<string, string>;

const TOKENS = [
  "ink",
  "charcoal-950",
  "charcoal-900",
  "charcoal-700",
  "charcoal-600",
  "parchment-100",
  "parchment-300",
  "parchment-500",
  "military-400",
  "military-600",
  "brass-300",
  "brass-500",
  "blood-400",
] as const;

/** Reads the theme's colour tokens from CSS, with fallbacks for environments without styles. */
export function readPalette(root: Element = document.documentElement): Palette {
  const styles = getComputedStyle(root);
  const fallback: Palette = {
    ink: "#0a0b09",
    "charcoal-950": "#121311",
    "charcoal-900": "#1a1c19",
    "charcoal-700": "#33372f",
    "charcoal-600": "#4a4f44",
    "parchment-100": "#efe6d2",
    "parchment-300": "#d6c9aa",
    "parchment-500": "#a89c7f",
    "military-400": "#8fa276",
    "military-600": "#5d6e4a",
    "brass-300": "#e2c27a",
    "brass-500": "#b8913f",
    "blood-400": "#d0705f",
  };
  return Object.fromEntries(
    TOKENS.map((token) => [
      token,
      styles.getPropertyValue(`--color-${token}`).trim() || (fallback[token] ?? "#888"),
    ]),
  );
}

export function graphStyle(c: Palette): StylesheetJson {
  const kindColors: Record<EntityKind, string | undefined> = {
    character: c["parchment-300"],
    event: c["military-400"],
    titan: c["blood-400"],
    location: c["parchment-500"],
    faction: c["military-600"],
    memory: c["brass-300"],
    arc: c["charcoal-600"],
  };

  return [
    {
      selector: "node",
      style: {
        label: "data(label)",
        color: c["parchment-300"],
        "font-family": '"Inter Variable", "Inter", system-ui, sans-serif',
        "font-size": 10.5,
        "font-weight": 500,
        "text-valign": "bottom",
        "text-margin-y": 7,
        "text-wrap": "wrap",
        "text-max-width": "110px",
        "text-outline-color": c.ink,
        "text-outline-width": 3,
        "text-outline-opacity": 0.9,
        width: 24,
        height: 24,
        "border-width": 2,
        "border-color": c.ink,
        "transition-property": "opacity, border-color, border-width",
        "transition-duration": 150,
      },
    },
    ...Object.entries(KIND_SHAPES).map(([kind, shape]) => ({
      selector: `node.kind-${kind}`,
      style: {
        shape: shape as never,
        "background-color": kindColors[kind as EntityKind] ?? c["parchment-500"],
      },
    })),
    {
      selector: "node.kind-titan",
      style: {
        "underlay-color": c["blood-400"],
        "underlay-padding": 6,
        "underlay-opacity": 0.18,
        "underlay-shape": "ellipse",
      } as never,
    },
    {
      selector: "node.center",
      style: {
        width: 40,
        height: 40,
        "border-width": 3,
        "border-color": c["brass-300"],
        color: c["parchment-100"],
        "font-size": 13,
        "font-weight": 700,
        "z-index": 10,
        // A brass halo marks the entity everything is centred on.
        "underlay-color": c["brass-300"],
        "underlay-padding": 14,
        "underlay-opacity": 0.22,
        "underlay-shape": "ellipse",
      } as never,
    },
    {
      selector: "node.uncertain",
      style: { "border-style": "dashed", "border-color": c["parchment-500"] },
    },
    {
      selector: "edge",
      style: {
        width: 1.25,
        opacity: 0.75,
        "curve-style": "bezier",
        "line-color": c["charcoal-600"],
        "target-arrow-shape": "triangle",
        "target-arrow-color": c["charcoal-600"],
        "arrow-scale": 0.8,
        "transition-property": "opacity, line-color",
        "transition-duration": 150,
      },
    },
    {
      selector: "edge.category-structural",
      style: { "line-color": c["parchment-500"], "target-arrow-color": c["parchment-500"] },
    },
    {
      selector: "edge.category-event",
      style: { "line-color": c["military-600"], "target-arrow-color": c["military-600"] },
    },
    {
      selector: "edge.category-causal",
      style: { "line-color": c["blood-400"], "target-arrow-color": c["blood-400"], width: 2.5 },
    },
    {
      selector: "edge.category-paths",
      style: { "line-color": c["brass-500"], "target-arrow-color": c["brass-500"] },
    },
    { selector: "edge.uncertain", style: { "line-style": "dashed" } },
    {
      selector: "edge.highlighted",
      style: {
        label: "data(label)",
        "font-size": 9,
        color: c["parchment-300"],
        "text-rotation": "autorotate",
        "font-family": '"JetBrains Mono Variable", ui-monospace, monospace',
        "text-background-color": c.ink,
        "text-background-opacity": 0.9,
        "text-background-padding": "3px",
        width: 2.25,
        opacity: 1,
      },
    },
    { selector: ".faded", style: { opacity: 0.12 } },
  ];
}
