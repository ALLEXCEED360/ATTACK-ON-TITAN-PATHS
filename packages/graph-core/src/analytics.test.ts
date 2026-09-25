import { type EdgeType, type EntityKind, resolveDate } from "@paths/shared";
import { describe, expect, it } from "vitest";
import { analytics } from "./analytics.ts";
import { type GraphEdge, type GraphNode, type Interval, createGraph } from "./graph.ts";
import { viewGraph } from "./view.ts";

// Synthetic data — never real story facts.

const open: Interval = { start: null, end: null };
const year = (y: number) => resolveDate({ year: y });

function node(id: string, extra: Partial<GraphNode> = {}): GraphNode {
  return { id, kind: id.split("_")[0] as EntityKind, revealedIn: 1, lifetime: open, ...extra };
}
function edge(source: string, type: EdgeType, target: string, revealedIn = 1): GraphEdge {
  return { id: `${source}-${type}-${target}`, source, target, type, revealedIn, own: open };
}
const happened = (y: number) => ({ lifetime: { start: year(y), end: year(y) } });

const graph = createGraph(
  [
    // A dies in 812, but that's only revealed in ch. 30.
    node("character_a", { lifetime: { start: null, end: year(812), endRevealedIn: 30 } }),
    node("character_b"),
    node("character_c"),
    node("character_d"),
    node("character_e"),
    node("faction_red"),
    node("faction_blue"),
    node("faction_green"),
    node("titan_t"),
    node("event_one", happened(810)),
    node("event_two", { ...happened(813), seq: 20 }),
    node("event_three", { ...happened(813), seq: 30 }),
    node("event_late", { ...happened(813), revealedIn: 40 }),
  ],
  [
    edge("character_a", "member_of", "faction_red"),
    edge("character_b", "member_of", "faction_blue"),
    edge("character_a", "participated_in", "event_one"),
    edge("character_b", "participated_in", "event_one"),
    edge("character_b", "participated_in", "event_two"),
    edge("character_c", "participated_in", "event_two"),
    edge("character_c", "holds", "titan_t", 20),
    // C joins red only after taking part in event_two, so red wasn't there.
    { ...edge("character_c", "member_of", "faction_red"), own: { start: year(814), end: null } },
    // Same year as event_two, so only story order can tell: D joins red at event_three (after
    // event_two), E joins green at event_two itself.
    {
      ...edge("character_d", "member_of", "faction_red"),
      own: { start: year(813), end: null },
      anchors: { from: { event: "event_three", at: "start" } },
    },
    {
      ...edge("character_e", "member_of", "faction_green"),
      own: { start: year(813), end: null },
      anchors: { from: { event: "event_two", at: "start" } },
    },
    edge("character_d", "participated_in", "event_two"),
    edge("character_e", "participated_in", "event_two"),
  ],
);

const at = (cutoff: number) => analytics(viewGraph(graph, { cutoff }).graph);

describe("analytics", () => {
  it("counts only what the reader knows", () => {
    expect(at(10).totals).toMatchObject({ characters: 5, events: 3, deaths: 0, relationships: 11 });
    expect(at(30).totals.deaths).toBe(1);
    expect(at(40).totals.events).toBe(4);
  });

  it("lists every year between the first and last event, empty ones included", () => {
    const { years, eventsPerYear } = at(10);
    expect(years).toEqual([810, 811, 812, 813]);
    expect(eventsPerYear.map((y) => y.events.length)).toEqual([1, 0, 0, 2]);
    // Same year: story order (seq), not alphabetical.
    expect(eventsPerYear.at(-1)?.events).toEqual(["event_two", "event_three"]);
  });

  it("follows connections year by year, ending them at a *known* death", () => {
    const a = (cutoff: number) => at(cutoff).connections.find((c) => c.id === "character_a");
    // Membership lasts; taking part in the 810 event only counts in 810. Before ch. 30 the
    // reader doesn't know A died in 812, so A's membership carries on into 813.
    expect(a(10)?.perYear).toEqual([2, 1, 1, 1]);
    expect(a(30)?.perYear).toEqual([2, 1, 1, 0]);
  });

  it("counts events where members of two factions took part together, while members", () => {
    const { factions, factionMatrix } = at(10);
    expect(factions).toEqual(["faction_blue", "faction_green", "faction_red"]);
    expect(factionMatrix).toEqual([
      [2, 1, 1],
      [1, 1, 0],
      [1, 0, 1],
    ]);
  });

  it("lists Titan holders once revealed", () => {
    expect(at(10).titans).toEqual([{ id: "titan_t", holders: [] }]);
    expect(at(20).titans[0]?.holders.map((h) => h.id)).toEqual(["character_c"]);
  });
});
