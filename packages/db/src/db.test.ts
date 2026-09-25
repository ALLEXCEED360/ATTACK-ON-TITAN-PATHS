import { fileURLToPath } from "node:url";
import { type Dataset, loadDataset, readDataDir, toGraphInput } from "@paths/data";
import { type Graph, bfs, createGraph, viewGraph } from "@paths/graph-core";
import { encodeBound } from "@paths/shared";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connect } from "./client.ts";
import { graphAt, neighborhood, search } from "./queries.ts";
import * as t from "./schema.ts";
import { buildSeedRows, seed } from "./seed.ts";

// Integration tests against a real Postgres (`pnpm db:up && pnpm db:migrate` first).
// They reseed the database from data/, which is safe: the database is a derived copy.

const DATA_DIR = fileURLToPath(new URL("../../../data/", import.meta.url));
const { db, close } = connect();

let dataset: Dataset;
let graph: Graph;

beforeAll(async () => {
  dataset = loadDataset(await readDataDir(DATA_DIR)).dataset;
  const { nodes, edges } = toGraphInput(dataset);
  graph = createGraph(nodes, edges);
  await seed(db, buildSeedRows(dataset));
});

afterAll(async () => {
  await close();
});

describe("seed", () => {
  it("stores every entity and edge", async () => {
    const [counts] = await db.execute<{ entities: number; edges: number }>(sql`
      select (select count(*) from entities)::int as entities,
             (select count(*) from edges)::int as edges
    `);
    expect(counts).toEqual({ entities: dataset.entities.size, edges: dataset.edges.length });
  });

  it("can be run again without duplicating anything", async () => {
    await seed(db, buildSeedRows(dataset));
    const [row] = await db.execute<{ n: number }>(sql`select count(*)::int as n from ${t.edges}`);
    expect(row?.n).toBe(dataset.edges.length);
  });

  it("rejects an edge to a missing entity (foreign key)", async () => {
    await expect(
      db.insert(t.edges).values({
        id: "edge_test",
        sourceId: "character_eren_yeager",
        targetId: "character_nobody",
        type: "sibling_of",
        category: "structural",
        revealedIn: 1,
        sources: [1],
        certainty: "stated",
        weight: 1,
      }),
    ).rejects.toThrow();
  });
});

describe("queries match graph-core", () => {
  const cases = [
    { id: "character_eren_yeager", depth: 1, cutoff: 10 },
    { id: "character_eren_yeager", depth: 2, cutoff: 139 },
    { id: "character_bertholdt_hoover", depth: 1, cutoff: 41 },
    { id: "character_bertholdt_hoover", depth: 1, cutoff: 42 },
    { id: "titan_colossal", depth: 3, cutoff: 42 },
    { id: "character_ymir_104th", depth: 2, cutoff: 20 },
  ];

  it.each(cases)("neighborhood of $id (depth $depth, ch. $cutoff)", async (c) => {
    const expected = bfs(viewGraph(graph, { cutoff: c.cutoff }).graph, c.id, c.depth);
    expect(await neighborhood(db, c)).toEqual(expected);
  });

  it.each([
    { cutoff: 20, at: undefined },
    { cutoff: 139, at: undefined },
    { cutoff: 139, at: encodeBound(846, 6, 1) },
    { cutoff: 50, at: encodeBound(850, 6, 1) },
  ])("graph at ch. $cutoff, moment $at", async ({ cutoff, at }) => {
    const view = viewGraph(graph, { cutoff, at }).graph;
    const result = await graphAt(db, { cutoff, at });
    expect(result.nodes.map((n) => n.id).sort()).toEqual([...view.nodes.keys()].sort());
    const key = (e: {
      sourceId?: string;
      source?: string;
      targetId?: string;
      target?: string;
      type: string;
    }) => `${e.sourceId ?? e.source ?? ""}|${e.type}|${e.targetId ?? e.target ?? ""}`;
    expect(result.edges.map(key).sort()).toEqual(view.edges.map(key).sort());
  });
});

describe("search", () => {
  const ids = async (q: string, cutoff: number) =>
    (await search(db, { q, cutoff })).results.map((r) => r.id);

  it("finds names from any spelling", async () => {
    const { results } = await search(db, { q: "jaeger", cutoff: 139 });
    expect(results.map((r) => r.id)).toEqual(
      expect.arrayContaining(["character_eren_yeager", "character_carla_yeager"]),
    );
    expect(results.find((r) => r.id === "character_eren_yeager")).toMatchObject({
      displayName: "Eren Yeager",
      reason: "name",
      detail: "Eren Jaeger",
    });
  });

  it("tolerates typos", async () => {
    expect(await ids("levy", 139)).toContain("character_levi");
  });

  it("never matches a name before its reveal", async () => {
    expect(await ids("historia", 40)).toEqual([]);
    const [top] = (await search(db, { q: "historia", cutoff: 42 })).results;
    expect(top).toMatchObject({ id: "character_krista_lenz", displayName: "Historia Reiss" });
  });

  it("shows the display name for the reader's chapter", async () => {
    const [top] = (await search(db, { q: "krista", cutoff: 10 })).results;
    expect(top).toMatchObject({ id: "character_krista_lenz", displayName: "Krista Lenz" });
  });

  it("requires every word to match — by name, description or connection", async () => {
    // "titan" isn't in Eren's name, but it is in his revealed description.
    const results = (await search(db, { q: "eren titan", cutoff: 139 })).results;
    expect(results[0]).toMatchObject({ id: "character_eren_yeager" });
  });

  it("matches through connected entities", async () => {
    const result = (await search(db, { q: "trost", cutoff: 139 })).results.find(
      (r) => r.id === "event_trost_gate_sealed",
    );
    expect(result).toMatchObject({ reason: "name" });
    expect(await ids("sealing battle", 139)).toContain("event_trost_gate_sealed");
  });

  it("never matches through unrevealed descriptions or relationships", async () => {
    // Reiner's description names the Armored Titan only from ch. 42; his `holds` edge too.
    expect(await ids("armored", 20)).not.toContain("character_reiner_braun");
    expect(await ids("armored", 42)).toContain("character_reiner_braun");
  });

  it("restricts to a year", async () => {
    const { year, results } = await search(db, { q: "shiganshina 845", cutoff: 139 });
    expect(year).toBe(845);
    expect(results.map((r) => r.id)).toContain("event_fall_of_wall_maria");
    expect(await ids("shiganshina 850", 139)).not.toContain("event_fall_of_wall_maria");
    // Carla died in 845, so she isn't found in 850.
    expect(await ids("carla 850", 139)).toEqual([]);
  });

  it("lists a year's events for a year alone", async () => {
    const { results } = await search(db, { q: "845", cutoff: 139 });
    expect(results).toMatchObject([{ id: "event_fall_of_wall_maria", reason: "year" }]);
  });
});
