import { fileURLToPath } from "node:url";
import { createGraph, shortestPath, viewGraph } from "@paths/graph-core";
import { type Entity, displayName, encodeBound } from "@paths/shared";
import { beforeAll, describe, expect, it } from "vitest";
import { readDataDir } from "./files.ts";
import { type Dataset, loadDataset } from "./load.ts";
import { toGraphInput } from "./resolve.ts";
import { validateDataset } from "./validate.ts";

// Checks against the real dataset in data/: it must stay valid, and the spoiler filter must
// behave sensibly on it.

const DATA_DIR = fileURLToPath(new URL("../../../data/", import.meta.url));

let dataset: Dataset;
beforeAll(async () => {
  const loaded = loadDataset(await readDataDir(DATA_DIR));
  expect(loaded.issues).toEqual([]);
  dataset = loaded.dataset;
});

function entity(id: string): Entity {
  const found = dataset.entities.get(id)?.entity;
  if (!found) throw new Error(`missing ${id}`);
  return found;
}

describe("the dataset in data/", () => {
  it("has no validation errors", () => {
    expect(validateDataset(dataset).filter((issue) => issue.level === "error")).toEqual([]);
  });

  it("hides a reveal until its chapter", () => {
    const { nodes, edges } = toGraphInput(dataset);
    const graph = createGraph(nodes, edges);
    const holds = (cutoff: number) =>
      viewGraph(graph, { cutoff })
        .graph.edges.filter((edge) => edge.type === "holds")
        .map((edge) => edge.source)
        .sort();

    expect(holds(20)).toEqual([]);
    expect(holds(41)).toEqual(["character_annie_leonhart"]);
    expect(holds(139)).toContain("character_reiner_braun");
  });

  it("changes a display name at its reveal", () => {
    const krista = entity("character_krista_lenz");
    expect(displayName(krista.names, 40)).toBe("Krista Lenz");
    expect(displayName(krista.names, 41)).toBe("Historia");
    expect(displayName(krista.names, 42)).toBe("Historia Reiss");
  });

  it("filters by world time", () => {
    const { nodes, edges } = toGraphInput(dataset);
    const view = viewGraph(createGraph(nodes, edges), {
      cutoff: 139,
      at: encodeBound(846, 6, 1),
    });
    // Carla died in 845, so she is gone by mid-846.
    expect(view.graph.nodes.has("character_carla_yeager")).toBe(false);
    expect(view.graph.nodes.has("character_eren_yeager")).toBe(true);
  });

  it("keeps someone whose death the reader hasn't reached", () => {
    const { nodes, edges } = toGraphInput(dataset);
    // Carla's death (845) is revealed in ch. 2: a ch. 1 reader must still see her in 846.
    const view = viewGraph(createGraph(nodes, edges), { cutoff: 1, at: encodeBound(846, 6, 1) });
    expect(view.graph.nodes.has("character_carla_yeager")).toBe(true);
  });

  it("finds a path only through revealed connections", () => {
    const { nodes, edges } = toGraphInput(dataset);
    const graph = createGraph(nodes, edges);
    const early = viewGraph(graph, { cutoff: 20 }).graph;
    const late = viewGraph(graph, { cutoff: 139 }).graph;
    const bertholdtToColossal = (g: typeof graph) =>
      shortestPath(g, "character_bertholdt_hoover", "titan_colossal");

    expect(bertholdtToColossal(early)).toBeNull();
    expect(bertholdtToColossal(late)?.cost).toBe(1);
  });
});
