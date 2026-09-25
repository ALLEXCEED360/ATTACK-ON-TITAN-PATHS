import type { DateRange, EdgeType, EntityKind } from "@paths/shared";
import { type Graph, type GraphEdge, type Interval, neighborsOf } from "./graph.ts";
import { intersect } from "./view.ts";

// PATHS mode (docs/features/paths-mode.md): how an entity connects across time — Titan lineages,
// lifetimes, events, memories and causes — laid out as lanes. Pure: it runs on a graph that has
// already been filtered to the reader's chapter (`viewGraph`), so nothing here can leak.

export interface PathsLane {
  id: string;
  kind: EntityKind;
  /** When the lane's entity exists (for a Titan: unbounded; its holders are the segments). */
  span: Interval;
  /** For a Titan lane: who held it, and when. */
  segments: { holder: string; span: Interval }[];
}

export interface PathsEvent {
  id: string;
  span: Interval;
  seq?: number;
  /** Character lanes that took part. */
  lanes: string[];
}

export interface PathsMemory {
  id: string;
  /** When the memory was originally experienced. */
  date: DateRange | null;
  experiencedBy: string | null;
  received: { by: string; span: Interval }[];
  depicts: string | null;
}

export interface PathsResult {
  center: string;
  /** False for kinds PATHS mode doesn't follow (locations, factions). */
  supported: boolean;
  lanes: PathsLane[];
  /** Lanes left out to keep the view readable (docs/features/paths-mode.md §4). */
  hiddenLanes: number;
  events: PathsEvent[];
  causal: { from: string; to: string }[];
  memories: PathsMemory[];
}

export const MAX_LANES = 12;
const CAUSAL_STEPS = 2;

/** An edge's active period in an already-filtered view (lifetimes there are what the reader knows). */
function activeIn(graph: Graph, edge: GraphEdge): Interval {
  const source = graph.nodes.get(edge.source);
  const target = graph.nodes.get(edge.target);
  return intersect(
    edge.own,
    source?.lifetime ?? { start: null, end: null },
    target?.lifetime ?? { start: null, end: null },
  );
}

function edgesOf(graph: Graph, id: string, type: EdgeType, direction: "out" | "in"): GraphEdge[] {
  return neighborsOf(graph, id)
    .map((a) => a.edge)
    .filter((e) => e.type === type && (direction === "out" ? e.source === id : e.target === id));
}

function kindOf(graph: Graph, id: string): EntityKind | undefined {
  return graph.nodes.get(id)?.kind;
}

export function pathsView(graph: Graph, center: string, maxLanes = MAX_LANES): PathsResult {
  const node = graph.nodes.get(center);
  const empty: PathsResult = {
    center,
    supported: false,
    lanes: [],
    hiddenLanes: 0,
    events: [],
    causal: [],
    memories: [],
  };
  if (!node) return empty;

  const characters = new Set<string>();
  const titans = new Set<string>();
  const memories = new Set<string>();
  const events = new Set<string>();

  const holdersOf = (titan: string) => edgesOf(graph, titan, "holds", "in").map((e) => e.source);
  const titansOf = (character: string) =>
    edgesOf(graph, character, "holds", "out").map((e) => e.target);
  const memoriesOf = (character: string) => [
    ...edgesOf(graph, character, "experienced", "out").map((e) => e.target),
    ...edgesOf(graph, character, "received", "out").map((e) => e.target),
  ];
  const peopleOf = (memory: string) => [
    ...edgesOf(graph, memory, "experienced", "in").map((e) => e.source),
    ...edgesOf(graph, memory, "received", "in").map((e) => e.source),
  ];

  switch (node.kind) {
    case "titan":
      titans.add(center);
      for (const holder of holdersOf(center)) characters.add(holder);
      // Memories passed between this Titan's holders.
      for (const holder of characters) {
        for (const memory of memoriesOf(holder)) {
          if (peopleOf(memory).filter((p) => characters.has(p)).length >= 2) memories.add(memory);
        }
      }
      break;
    case "character":
      characters.add(center);
      for (const titan of titansOf(center)) {
        titans.add(titan);
        for (const holder of holdersOf(titan)) characters.add(holder);
      }
      for (const memory of memoriesOf(center)) {
        memories.add(memory);
        for (const person of peopleOf(memory)) characters.add(person);
      }
      break;
    case "event": {
      events.add(center);
      for (const e of edgesOf(graph, center, "participated_in", "in")) {
        if (kindOf(graph, e.source) === "character") characters.add(e.source);
      }
      // Causal chains, a couple of steps in each direction.
      for (const direction of ["in", "out"] as const) {
        let frontier = [center];
        for (let step = 0; step < CAUSAL_STEPS; step++) {
          frontier = frontier.flatMap((id) =>
            edgesOf(graph, id, "caused", direction).map((e) =>
              direction === "in" ? e.source : e.target,
            ),
          );
          for (const id of frontier) events.add(id);
        }
      }
      break;
    }
    case "memory":
      memories.add(center);
      for (const person of peopleOf(center)) characters.add(person);
      break;
    case "location":
    case "faction":
    case "arc":
      return empty;
  }

  for (const memory of memories) {
    for (const e of edgesOf(graph, memory, "depicts", "out")) events.add(e.target);
  }

  // Events the lane characters took part in.
  const participants = new Map<string, Set<string>>();
  for (const character of characters) {
    for (const e of edgesOf(graph, character, "participated_in", "out")) {
      events.add(e.target);
      const set = participants.get(e.target) ?? new Set<string>();
      set.add(character);
      participants.set(e.target, set);
    }
  }

  // Keep the view readable: the centre and Titans always stay; other characters by involvement.
  const involvement = (id: string) =>
    [...participants.values()].filter((set) => set.has(id)).length +
    memoriesOf(id).filter((m) => memories.has(m)).length +
    titansOf(id).filter((t) => titans.has(t)).length;
  const others = [...characters]
    .filter((id) => id !== center)
    .sort((a, b) => involvement(b) - involvement(a) || a.localeCompare(b));
  const room = Math.max(0, maxLanes - titans.size - (characters.has(center) ? 1 : 0));
  const shown = new Set([...(characters.has(center) ? [center] : []), ...others.slice(0, room)]);
  const hiddenLanes = others.length - Math.min(others.length, room);

  const firstMoment = (id: string) => {
    const life = graph.nodes.get(id)?.lifetime.start?.earliest;
    if (life !== undefined) return life;
    const times = [...participants]
      .filter(([, set]) => set.has(id))
      .map(([event]) => graph.nodes.get(event)?.lifetime.start?.earliest ?? Infinity);
    return Math.min(Infinity, ...times);
  };
  const orderedCharacters = [...shown].sort(
    (a, b) =>
      Number(b === center) - Number(a === center) ||
      firstMoment(a) - firstMoment(b) ||
      a.localeCompare(b),
  );

  const lanes: PathsLane[] = [
    ...[...titans].map((id) => ({
      id,
      kind: "titan" as const,
      span: { start: null, end: null },
      segments: edgesOf(graph, id, "holds", "in")
        .filter((e) => shown.has(e.source))
        .map((e) => ({ holder: e.source, span: activeIn(graph, e) })),
    })),
    ...orderedCharacters.map((id) => ({
      id,
      kind: "character" as const,
      span: graph.nodes.get(id)?.lifetime ?? { start: null, end: null },
      segments: [],
    })),
  ];
  // The focus goes first when it's a lane itself.
  lanes.sort((a, b) => Number(b.id === center) - Number(a.id === center));

  const pathsEvents: PathsEvent[] = [...events]
    .map((id) => {
      const event = graph.nodes.get(id);
      const lanesHere = [...(participants.get(id) ?? [])].filter((c) => shown.has(c)).sort();
      return {
        id,
        span: event?.lifetime ?? { start: null, end: null },
        ...(event?.seq === undefined ? {} : { seq: event.seq }),
        lanes: lanesHere,
      };
    })
    // An event whose only participants were left out has nowhere to sit, unless it's the focus
    // of the view (the event itself, its causes and effects, or a remembered event).
    .filter((e) => e.lanes.length > 0 || node.kind === "event" || node.kind === "memory")
    .sort(
      (a, b) =>
        (a.span.start?.earliest ?? Infinity) - (b.span.start?.earliest ?? Infinity) ||
        (a.seq ?? Infinity) - (b.seq ?? Infinity) ||
        a.id.localeCompare(b.id),
    );
  const shownEvents = new Set(pathsEvents.map((e) => e.id));

  const causal = graph.edges
    .filter((e) => e.type === "caused" && shownEvents.has(e.source) && shownEvents.has(e.target))
    .map((e) => ({ from: e.source, to: e.target }));

  const pathsMemories: PathsMemory[] = [...memories].map((id) => ({
    id,
    date: graph.nodes.get(id)?.date ?? null,
    experiencedBy:
      edgesOf(graph, id, "experienced", "in")
        .map((e) => e.source)
        .find((p) => shown.has(p)) ?? null,
    received: edgesOf(graph, id, "received", "in")
      .filter((e) => shown.has(e.source))
      .map((e) => ({ by: e.source, span: activeIn(graph, e) })),
    depicts: edgesOf(graph, id, "depicts", "out")[0]?.target ?? null,
  }));

  return {
    center,
    supported: true,
    lanes,
    hiddenLanes,
    events: pathsEvents,
    causal,
    memories: pathsMemories,
  };
}
