import { type EdgeType, type EntityKind, resolveDate } from "@paths/shared";
import { describe, expect, it } from "vitest";
import { type GraphEdge, type GraphNode, type Interval, createGraph } from "./graph.ts";
import { pathsView } from "./paths.ts";

// A synthetic lineage — never real story facts.

const open: Interval = { start: null, end: null };
const year = (y: number) => resolveDate({ year: y });

function node(id: string, extra: Partial<GraphNode> = {}): GraphNode {
  return { id, kind: id.split("_")[0] as EntityKind, revealedIn: 1, lifetime: open, ...extra };
}

function edge(source: string, type: EdgeType, target: string, own: Interval = open): GraphEdge {
  return { id: `${source}-${type}-${target}`, source, target, type, revealedIn: 1, own };
}

const lived = (from: number, to: number) => ({ lifetime: { start: year(from), end: year(to) } });
const happened = (y: number, seq?: number) => ({
  lifetime: { start: year(y), end: year(y) },
  ...(seq === undefined ? {} : { seq }),
});

const graph = createGraph(
  [
    node("titan_x"),
    node("character_first", lived(800, 813)),
    node("character_second", lived(805, 850)),
    node("character_bystander"),
    node("memory_m", { date: year(812) }),
    node("event_a", happened(812, 10)),
    node("event_b", happened(812, 20)),
    node("event_c", happened(813)),
    node("location_l"),
  ],
  [
    edge("character_first", "holds", "titan_x", { start: year(810), end: null }),
    edge("character_second", "holds", "titan_x", { start: year(813), end: null }),
    edge("character_first", "experienced", "memory_m"),
    // Received in 809 — before it was experienced (812): a memory from the future.
    edge("character_second", "received", "memory_m", { start: year(809), end: null }),
    edge("memory_m", "depicts", "event_a"),
    edge("character_first", "participated_in", "event_a"),
    edge("character_first", "participated_in", "event_b"),
    edge("character_bystander", "participated_in", "event_b"),
    edge("event_a", "caused", "event_b"),
    edge("event_b", "caused", "event_c"),
  ],
);

describe("pathsView", () => {
  it("lays out a Titan's lineage: its lane, its holders, and memories passed between them", () => {
    const view = pathsView(graph, "titan_x");
    expect(view.lanes.map((l) => l.id)).toEqual(["titan_x", "character_first", "character_second"]);
    expect(view.lanes[0]?.segments).toEqual([
      { holder: "character_first", span: { start: year(810), end: year(813) } },
      { holder: "character_second", span: { start: year(813), end: year(850) } },
    ]);
    expect(view.memories).toEqual([
      {
        id: "memory_m",
        date: year(812),
        experiencedBy: "character_first",
        received: [{ by: "character_second", span: { start: year(809), end: year(850) } }],
        depicts: "event_a",
      },
    ]);
  });

  it("follows a character to their Titans, its other holders and their memories", () => {
    const view = pathsView(graph, "character_second");
    expect(view.lanes.map((l) => l.id)).toEqual(["character_second", "titan_x", "character_first"]);
    expect(view.events.map((e) => e.id)).toEqual(["event_a", "event_b"]);
    expect(view.causal).toEqual([{ from: "event_a", to: "event_b" }]);
  });

  it("orders same-year events by seq", () => {
    const view = pathsView(graph, "character_first");
    expect(view.events.map((e) => [e.id, e.seq])).toEqual([
      ["event_a", 10],
      ["event_b", 20],
    ]);
  });

  it("centres an event on its participants and its causal chain", () => {
    const view = pathsView(graph, "event_b");
    expect(view.lanes.map((l) => l.id).sort()).toEqual(["character_bystander", "character_first"]);
    expect(view.events.map((e) => e.id)).toEqual(["event_a", "event_b", "event_c"]);
    expect(view.causal).toEqual([
      { from: "event_a", to: "event_b" },
      { from: "event_b", to: "event_c" },
    ]);
  });

  it("limits the number of lanes, keeping the centre and the Titans", () => {
    const view = pathsView(graph, "titan_x", 2);
    expect(view.lanes.map((l) => l.id)).toEqual(["titan_x", "character_first"]);
    expect(view.hiddenLanes).toBe(1);
  });

  it("doesn't follow places or groups", () => {
    expect(pathsView(graph, "location_l")).toMatchObject({ supported: false, lanes: [] });
    expect(pathsView(graph, "character_nobody").supported).toBe(false);
  });
});
