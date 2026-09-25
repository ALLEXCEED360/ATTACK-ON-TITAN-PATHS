import { type EdgeType, encodeBound, resolveDate } from "@paths/shared";
import { describe, expect, it } from "vitest";
import { betweennessCentrality, degreeCentrality } from "./centrality.ts";
import { type GraphEdge, type GraphNode, type Interval, createGraph } from "./graph.ts";
import { shortestPath } from "./shortest-path.ts";
import { bfs, connectedComponents, dfs, findDirectedCycle } from "./traversal.ts";
import { presenceAt, viewGraph } from "./view.ts";

const always: Interval = { start: null, end: null };

function node(id: string, revealedIn = 1, lifetime = always): GraphNode {
  const kind = id.split("_")[0] as GraphNode["kind"];
  return { id, kind, revealedIn, lifetime };
}

function edge(source: string, type: EdgeType, target: string, revealedIn = 1): GraphEdge {
  return { source, target, type, revealedIn, active: always };
}

const years = (from: number, to: number): Interval => ({
  start: resolveDate({ year: from }),
  end: resolveDate({ year: to }),
});

describe("createGraph", () => {
  it("rejects edges with missing endpoints", () => {
    expect(() =>
      createGraph([node("character_a")], [edge("character_a", "parent_of", "character_x")]),
    ).toThrow();
  });

  it("connects both endpoints", () => {
    const graph = createGraph(
      [node("character_a"), node("character_b")],
      [edge("character_a", "parent_of", "character_b")],
    );
    expect(graph.adjacency.get("character_b")?.[0]?.neighbor).toBe("character_a");
  });
});

describe("presenceAt", () => {
  const interval = years(845, 850);

  it("is absent outside the interval", () => {
    expect(presenceAt(interval, encodeBound(844, 12, 31))).toBe("absent");
    expect(presenceAt(interval, encodeBound(851, 1, 1))).toBe("absent");
  });

  it("is uncertain inside a fuzzy start or end", () => {
    expect(presenceAt(interval, encodeBound(845, 6, 1))).toBe("uncertain");
    expect(presenceAt(interval, encodeBound(850, 6, 1))).toBe("uncertain");
  });

  it("is certain in between", () => {
    expect(presenceAt(interval, encodeBound(847, 6, 1))).toBe("certain");
  });

  it("treats null bounds as unbounded", () => {
    expect(presenceAt(always, encodeBound(-2000, 1, 1))).toBe("certain");
  });
});

describe("viewGraph", () => {
  const graph = createGraph(
    [node("character_a", 1), node("character_b", 1), node("character_c", 50, years(845, 850))],
    [
      edge("character_a", "sibling_of", "character_b", 1),
      edge("character_a", "parent_of", "character_c", 50),
      { ...edge("character_a", "spouse_of", "character_b", 30), active: years(840, 846) },
    ],
  );

  it("removes everything past the cutoff — nodes and edges", () => {
    const { graph: view } = viewGraph(graph, { cutoff: 20 });
    expect([...view.nodes.keys()]).toEqual(["character_a", "character_b"]);
    expect(view.edges.map((e) => e.type)).toEqual(["sibling_of"]);
  });

  it("drops edges whose endpoint is past the cutoff", () => {
    const withLateEdge = createGraph(graph.nodes.values(), [
      edge("character_a", "parent_of", "character_c", 1),
    ]);
    expect(viewGraph(withLateEdge, { cutoff: 20 }).graph.edges).toEqual([]);
  });

  it("filters by time and flags uncertain items", () => {
    const view = viewGraph(graph, { cutoff: 139, at: encodeBound(846, 6, 1) });
    expect(view.graph.nodes.has("character_c")).toBe(true);
    expect(view.graph.edges.map((e) => e.type).sort()).toEqual([
      "parent_of",
      "sibling_of",
      "spouse_of",
    ]);
    expect([...view.uncertainEdges].map((e) => e.type)).toEqual(["spouse_of"]);

    const later = viewGraph(graph, { cutoff: 139, at: encodeBound(860, 1, 1) });
    expect(later.graph.nodes.has("character_c")).toBe(false);
    expect(later.graph.edges.map((e) => e.type)).toEqual(["sibling_of"]);
  });
});

describe("traversal", () => {
  // a — b — c — d    e (isolated)
  const graph = createGraph(
    ["character_a", "character_b", "character_c", "character_d", "character_e"].map((id) =>
      node(id),
    ),
    [
      edge("character_a", "sibling_of", "character_b"),
      edge("character_b", "sibling_of", "character_c"),
      edge("character_c", "sibling_of", "character_d"),
    ],
  );

  it("bfs finds depths, limited by maxDepth", () => {
    expect(bfs(graph, "character_a")).toEqual(
      new Map([
        ["character_a", 0],
        ["character_b", 1],
        ["character_c", 2],
        ["character_d", 3],
      ]),
    );
    expect([...bfs(graph, "character_a", 1).keys()]).toEqual(["character_a", "character_b"]);
  });

  it("dfs visits a whole branch", () => {
    expect(dfs(graph, "character_b")).toEqual([
      "character_b",
      "character_a",
      "character_c",
      "character_d",
    ]);
  });

  it("finds connected components, largest first", () => {
    expect(connectedComponents(graph)).toEqual([
      ["character_a", "character_b", "character_c", "character_d"],
      ["character_e"],
    ]);
  });

  it("detects directed cycles", () => {
    expect(
      findDirectedCycle([
        { source: "x", target: "y" },
        { source: "y", target: "z" },
      ]),
    ).toBeNull();
    expect(
      findDirectedCycle([
        { source: "x", target: "y" },
        { source: "y", target: "z" },
        { source: "z", target: "x" },
      ]),
    ).toEqual(["x", "y", "z", "x"]);
  });
});

describe("shortestPath", () => {
  // Two routes from a to d: through a faction (member_of, weight 3 each)
  // or through family (parent_of, weight 1 each, one step longer).
  const graph = createGraph(
    ["character_a", "character_b", "character_c", "character_d", "faction_f", "character_z"].map(
      (id) => node(id),
    ),
    [
      edge("character_a", "member_of", "faction_f"),
      edge("character_d", "member_of", "faction_f"),
      edge("character_a", "parent_of", "character_b"),
      edge("character_b", "parent_of", "character_c"),
      edge("character_c", "parent_of", "character_d"),
    ],
  );

  it("prefers stronger links over fewer hops", () => {
    const path = shortestPath(graph, "character_a", "character_d");
    expect(path?.nodes).toEqual(["character_a", "character_b", "character_c", "character_d"]);
    expect(path?.cost).toBe(3);
  });

  it("respects excluded categories, types and nodes", () => {
    expect(
      shortestPath(graph, "character_a", "character_d", { excludeTypes: new Set(["parent_of"]) })
        ?.nodes,
    ).toEqual(["character_a", "faction_f", "character_d"]);
    expect(
      shortestPath(graph, "character_a", "character_d", {
        excludeTypes: new Set(["parent_of"]),
        excludeNodes: new Set(["faction_f"]),
      }),
    ).toBeNull();
  });

  it("returns null for unconnected or unknown nodes", () => {
    expect(shortestPath(graph, "character_a", "character_z")).toBeNull();
    expect(shortestPath(graph, "character_a", "character_missing")).toBeNull();
  });

  it("returns a zero-cost path from a node to itself", () => {
    expect(shortestPath(graph, "character_a", "character_a")).toEqual({
      nodes: ["character_a"],
      edges: [],
      cost: 0,
    });
  });
});

describe("centrality", () => {
  // a — b — c, plus a second relationship between a and b
  const graph = createGraph(
    ["character_a", "character_b", "character_c"].map((id) => node(id)),
    [
      edge("character_a", "sibling_of", "character_b"),
      edge("character_a", "killed", "character_b"),
      edge("character_b", "sibling_of", "character_c"),
    ],
  );

  it("counts every relationship for degree", () => {
    expect(degreeCentrality(graph).get("character_b")).toBe(3);
  });

  it("scores the middle of a path for betweenness", () => {
    expect(betweennessCentrality(graph)).toEqual(
      new Map([
        ["character_a", 0],
        ["character_b", 1],
        ["character_c", 0],
      ]),
    );
  });
});
