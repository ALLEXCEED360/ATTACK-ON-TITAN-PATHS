import type { EntityKind } from "./ids.ts";

// The edge vocabulary (docs/model/relationships.md §4). A type that isn't here doesn't exist.

export const EDGE_CATEGORIES = ["structural", "event", "causal", "paths"] as const;
export type EdgeCategory = (typeof EDGE_CATEGORIES)[number];

export interface EdgeTypeDefinition {
  category: EdgeCategory;
  /** Symmetric types have no direction and are stored once. */
  symmetric: boolean;
  source: readonly EntityKind[];
  target: readonly EntityKind[];
  /** Source and target must be the same kind (e.g. location part_of location). */
  sameKind?: true;
  /** Whether the edge may carry `from` / `until`. */
  timeBounded: boolean;
  /** Cost in shortest-path search; lower is a stronger link. */
  weight: number;
  /** Label when viewed from the target's side; null for symmetric types. */
  inverse: string | null;
}

export const EDGE_TYPES = {
  // Structural
  parent_of: {
    category: "structural",
    symmetric: false,
    source: ["character"],
    target: ["character"],
    timeBounded: false,
    weight: 1,
    inverse: "child of",
  },
  sibling_of: {
    category: "structural",
    symmetric: true,
    source: ["character"],
    target: ["character"],
    timeBounded: false,
    weight: 1,
    inverse: null,
  },
  spouse_of: {
    category: "structural",
    symmetric: true,
    source: ["character"],
    target: ["character"],
    timeBounded: true,
    weight: 1,
    inverse: null,
  },
  holds: {
    category: "structural",
    symmetric: false,
    source: ["character"],
    target: ["titan"],
    timeBounded: true,
    weight: 1,
    inverse: "held by",
  },
  member_of: {
    category: "structural",
    symmetric: false,
    source: ["character"],
    target: ["faction"],
    timeBounded: true,
    weight: 3,
    inverse: "has member",
  },
  leads: {
    category: "structural",
    symmetric: false,
    source: ["character"],
    target: ["faction"],
    timeBounded: true,
    weight: 2,
    inverse: "led by",
  },
  part_of: {
    category: "structural",
    symmetric: false,
    source: ["faction", "location"],
    target: ["faction", "location"],
    sameKind: true,
    timeBounded: true,
    weight: 3,
    inverse: "includes",
  },
  born_in: {
    category: "structural",
    symmetric: false,
    source: ["character"],
    target: ["location"],
    timeBounded: false,
    weight: 2,
    inverse: "birthplace of",
  },
  lives_in: {
    category: "structural",
    symmetric: false,
    source: ["character"],
    target: ["location"],
    timeBounded: true,
    weight: 3,
    inverse: "home of",
  },
  based_at: {
    category: "structural",
    symmetric: false,
    source: ["faction"],
    target: ["location"],
    timeBounded: true,
    weight: 3,
    inverse: "base of",
  },
  controls: {
    category: "structural",
    symmetric: false,
    source: ["faction"],
    target: ["location"],
    timeBounded: true,
    weight: 3,
    inverse: "controlled by",
  },
  allied_with: {
    category: "structural",
    symmetric: true,
    source: ["faction"],
    target: ["faction"],
    timeBounded: true,
    weight: 2,
    inverse: null,
  },
  at_war_with: {
    category: "structural",
    symmetric: true,
    source: ["faction"],
    target: ["faction"],
    timeBounded: true,
    weight: 2,
    inverse: null,
  },

  // Event
  participated_in: {
    category: "event",
    symmetric: false,
    source: ["character", "faction"],
    target: ["event"],
    timeBounded: false,
    weight: 2,
    inverse: "participant",
  },
  occurred_at: {
    category: "event",
    symmetric: false,
    source: ["event"],
    target: ["location"],
    timeBounded: false,
    weight: 2,
    inverse: "site of",
  },
  sub_event_of: {
    category: "event",
    symmetric: false,
    source: ["event"],
    target: ["event"],
    timeBounded: false,
    weight: 1,
    inverse: "includes",
  },
  killed: {
    category: "event",
    symmetric: false,
    source: ["character"],
    target: ["character"],
    timeBounded: false,
    weight: 1,
    inverse: "killed by",
  },

  // Causal
  caused: {
    category: "causal",
    symmetric: false,
    source: ["event"],
    target: ["event"],
    timeBounded: false,
    weight: 1,
    inverse: "caused by",
  },

  // Paths
  experienced: {
    category: "paths",
    symmetric: false,
    source: ["character"],
    target: ["memory"],
    timeBounded: false,
    weight: 1,
    inverse: "experienced by",
  },
  received: {
    category: "paths",
    symmetric: false,
    source: ["character"],
    target: ["memory"],
    timeBounded: true,
    weight: 1,
    inverse: "received by",
  },
  depicts: {
    category: "paths",
    symmetric: false,
    source: ["memory"],
    target: ["event"],
    timeBounded: false,
    weight: 1,
    inverse: "depicted in",
  },
} as const satisfies Record<string, EdgeTypeDefinition>;

export type EdgeType = keyof typeof EDGE_TYPES;

export const EDGE_TYPE_NAMES = Object.keys(EDGE_TYPES) as EdgeType[];

export function edgeDefinition(type: EdgeType): EdgeTypeDefinition {
  return EDGE_TYPES[type];
}
