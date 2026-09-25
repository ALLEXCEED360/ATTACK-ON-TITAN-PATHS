import { fileURLToPath } from "node:url";
import { type Dataset, loadDataset, readDataDir } from "@paths/data";
import { buildSeedRows, connect, seed } from "@paths/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "./app.ts";
import { loadStore } from "./store.ts";

// Integration tests against a real, freshly seeded Postgres (`pnpm db:up && pnpm db:migrate`).

const DATA_DIR = fileURLToPath(new URL("../../../data/", import.meta.url));
const { db, close } = connect();
// Loaded up front: the spoiler crawler derives its test cases from the data.
const dataset: Dataset = loadDataset(await readDataDir(DATA_DIR)).dataset;
let app: Awaited<ReturnType<typeof buildApp>>;

beforeAll(async () => {
  await seed(db, buildSeedRows(dataset));
  app = await buildApp({ db, store: await loadStore(db) });
});

afterAll(async () => {
  await app.close();
  await close();
});

async function get(url: string) {
  const response = await app.inject({ method: "GET", url });
  return { status: response.statusCode, body: response.json<Record<string, unknown>>(), response };
}

describe("basics", () => {
  it("reports health without caching", async () => {
    const { status, body, response } = await get("/health");
    expect(status).toBe(200);
    expect(body).toEqual({ status: "ok" });
    expect(response.headers["cache-control"]).toBe("no-store");
  });

  it("requires a valid cutoff on data endpoints", async () => {
    expect(await get("/entities")).toMatchObject({
      status: 400,
      body: {
        error: "bad_request",
        message: expect.stringContaining("cutoff is required") as string,
      },
    });
    expect((await get("/entities?cutoff=0")).status).toBe(400);
    expect((await get("/entities?cutoff=140")).status).toBe(400);
    expect((await get("/timeline?cutoff=abc")).body).toMatchObject({ error: "bad_request" });
  });

  it("marks data responses cacheable", async () => {
    const { response } = await get("/entities?cutoff=10");
    expect(response.headers["cache-control"]).toBe("public, max-age=300");
  });

  it("serves OpenAPI docs for every route", async () => {
    const { status, body } = await get("/docs/json");
    expect(status).toBe(200);
    expect(Object.keys(body.paths as object).sort()).toEqual([
      "/entities",
      "/entities/{id}",
      "/graph/neighborhood/{id}",
      "/graph/path",
      "/health",
      "/search",
      "/timeline",
    ]);
  });

  it("answers unknown routes with a JSON 404", async () => {
    expect(await get("/nope")).toMatchObject({ status: 404, body: { error: "not_found" } });
  });
});

describe("entities", () => {
  it("changes the display name at its reveal", async () => {
    expect((await get("/entities/character_krista_lenz?cutoff=40")).body.name).toBe("Krista Lenz");
    expect((await get("/entities/character_krista_lenz?cutoff=42")).body.name).toBe(
      "Historia Reiss",
    );
  });

  it("hides entities past the cutoff with a neutral message", async () => {
    expect(await get("/entities/character_ymir_104th?cutoff=10")).toMatchObject({
      status: 404,
      body: { error: "beyond_cutoff" },
    });
    expect(await get("/entities/character_nobody?cutoff=10")).toMatchObject({
      status: 404,
      body: { error: "not_found" },
    });
  });

  it("reveals a death only at its chapter", async () => {
    expect((await get("/entities/character_hannes?cutoff=49")).body.died).toBeNull();
    expect((await get("/entities/character_hannes?cutoff=50")).body.died).toMatchObject({
      date: { year: 850 },
      certainty: "inferred",
    });
  });

  it("clips citations to the cutoff", async () => {
    expect((await get("/entities/character_krista_lenz?cutoff=41")).body.sources).toEqual([
      2, 40, 41,
    ]);
  });

  it("filters the list by kind", async () => {
    const { body } = await get("/entities?cutoff=139&kind=titan");
    expect((body.items as { id: string }[]).map((i) => i.id).sort()).toEqual([
      "titan_armored",
      "titan_colossal",
      "titan_coordinate",
      "titan_female",
    ]);
  });
});

describe("graph", () => {
  const ids = (list: unknown) => (list as { id: string }[]).map((x) => x.id);

  it("adds a connection only once it is revealed", async () => {
    const before = await get("/graph/neighborhood/character_bertholdt_hoover?cutoff=41");
    const after = await get("/graph/neighborhood/character_bertholdt_hoover?cutoff=42");
    expect(ids(before.body.nodes)).not.toContain("titan_colossal");
    expect(ids(after.body.nodes)).toContain("titan_colossal");
  });

  it("filters by edge category", async () => {
    const { body } = await get(
      "/graph/neighborhood/character_eren_yeager?cutoff=139&categories=structural",
    );
    const categories = new Set((body.edges as { category: string }[]).map((e) => e.category));
    expect([...categories]).toEqual(["structural"]);
  });

  it("filters by world time", async () => {
    const { body } = await get("/graph/neighborhood/character_eren_yeager?cutoff=139&at=846");
    expect(ids(body.nodes)).not.toContain("character_carla_yeager");
  });

  it("rejects an invalid moment", async () => {
    expect(
      (await get("/graph/neighborhood/character_eren_yeager?cutoff=139&at=850-13")).status,
    ).toBe(400);
  });

  it("finds a path, and none when the link isn't revealed", async () => {
    const url =
      "/graph/path?from=character_bertholdt_hoover&to=titan_colossal&categories=structural";
    expect((await get(`${url}&cutoff=41`)).body.path).toBeNull();
    expect((await get(`${url}&cutoff=42`)).body.path).toMatchObject({ cost: 1 });
  });

  it("respects excluded entities", async () => {
    const base = "/graph/path?cutoff=139&from=character_mikasa_ackerman&to=titan_colossal";
    const direct = await get(base);
    const avoiding = await get(`${base}&exclude=event_fall_of_wall_maria`);
    expect(ids((direct.body.path as { nodes: unknown }).nodes)).toContain(
      "event_fall_of_wall_maria",
    );
    expect(ids((avoiding.body.path as { nodes: unknown }).nodes)).not.toContain(
      "event_fall_of_wall_maria",
    );
  });
});

describe("timeline and search", () => {
  it("orders by world time or by reveal", async () => {
    const world = ids((await get("/timeline?cutoff=139&order=world")).body.items);
    const story = ids((await get("/timeline?cutoff=139&order=story")).body.items);
    expect(world.slice(0, 3)).toEqual([
      "event_mikasa_rescue",
      "event_fall_of_wall_maria",
      "event_wall_maria_recovery_operation",
    ]);
    expect(story[0]).toBe("event_fall_of_wall_maria");
    expect(world.indexOf("event_battle_of_trost")).toBeLessThan(
      world.indexOf("event_trost_gate_sealed"),
    );
  });

  it("searches revealed names only", async () => {
    expect((await get("/search?cutoff=40&q=historia")).body.items).toEqual([]);
    expect((await get("/search?cutoff=41&q=historia")).body.items).toMatchObject([
      { id: "character_krista_lenz", name: "Historia" },
    ]);
  });

  function ids(list: unknown) {
    return (list as { id: string }[]).map((x) => x.id);
  }
});

describe("spoiler crawler", () => {
  /** Every string a reader at `cutoff` must never receive. */
  function hiddenStrings(cutoff: number): string[] {
    const hidden: string[] = [];
    for (const { entity } of dataset.entities.values()) {
      if (entity.revealedIn > cutoff) hidden.push(entity.id);
      for (const name of entity.names) {
        if (name.revealedIn > cutoff) hidden.push(name.name, ...(name.variants ?? []));
      }
      for (const segment of entity.description) {
        if (segment.revealedIn > cutoff) hidden.push(segment.text);
      }
    }
    return hidden;
  }

  /** The chapter just before each reveal: where a leak would show up. */
  function boundaryCutoffs(): number[] {
    const reveals = new Set<number>();
    for (const { entity } of dataset.entities.values()) {
      reveals.add(entity.revealedIn);
      for (const n of entity.names) reveals.add(n.revealedIn);
      for (const s of entity.description) reveals.add(s.revealedIn);
    }
    for (const { edge } of dataset.edges) reveals.add(edge.revealedIn);
    return [...reveals]
      .map((r) => r - 1)
      .filter((c) => c >= 1)
      .sort((a, b) => a - b);
  }

  it("covers several boundaries", () => {
    expect(boundaryCutoffs().length).toBeGreaterThan(10);
  });

  it.each(boundaryCutoffs())("leaks nothing at chapter %i", async (cutoff) => {
    const hidden = hiddenStrings(cutoff).map((s) => s.toLowerCase());
    const bodies: { url: string; body: string }[] = [];
    const fetch = async (url: string) => {
      const response = await app.inject({ method: "GET", url });
      bodies.push({ url, body: response.body });
      return response.json<Record<string, unknown>>();
    };

    const list = (await fetch(`/entities?cutoff=${String(cutoff)}`)).items as { id: string }[];
    for (const { id } of list) {
      await fetch(`/entities/${id}?cutoff=${String(cutoff)}`);
      await fetch(`/graph/neighborhood/${id}?cutoff=${String(cutoff)}&depth=3`);
    }
    await fetch(`/timeline?cutoff=${String(cutoff)}&order=world`);
    await fetch(`/timeline?cutoff=${String(cutoff)}&order=story`);
    for (const term of ["historia", "armored", "colossal", "female", "coordinate", "ymir"]) {
      await fetch(`/search?cutoff=${String(cutoff)}&q=${term}`);
    }

    const leaks = bodies.flatMap(({ url, body }) => {
      const lower = body.toLowerCase();
      return hidden.filter((s) => lower.includes(s)).map((s) => `${url} → ${s}`);
    });
    expect(leaks).toEqual([]);
  });
});
