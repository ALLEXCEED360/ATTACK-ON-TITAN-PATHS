import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { stringify } from "yaml";
import type { Issue } from "./issues.ts";
import { type SourceFile, loadDataset } from "./load.ts";
import { toGraphInput } from "./resolve.ts";
import { SCHEMA_DIR, generateSchemas } from "./schemas.ts";
import { validateDataset } from "./validate.ts";

// Synthetic entities — tests never depend on real story facts.

const stated = { certainty: "stated" } as const;
const fact = (revealedIn = 1) => ({ revealedIn, sources: [revealedIn], ...stated });

function file(path: string, data: unknown): SourceFile {
  return { path, content: stringify(data) };
}

function entity(folder: string, id: string, extra: Record<string, unknown> = {}): SourceFile {
  const revealedIn = typeof extra.revealedIn === "number" ? extra.revealedIn : 1;
  return file(`${folder}/${id}.yaml`, {
    id,
    names: [{ name: id, revealedIn }],
    revealedIn,
    sources: [revealedIn],
    ...extra,
  });
}

const character = (id: string, extra?: Record<string, unknown>) => entity("characters", id, extra);
const titan = (id: string, extra?: Record<string, unknown>) => entity("titans", id, extra);
const event = (id: string, year: number, extra?: Record<string, unknown>) =>
  entity("events", id, { start: { date: { year }, ...fact() }, ...extra });

const reference: SourceFile[] = [
  file("reference/volumes.yaml", [{ volume: 1, chapters: [1, 139] }]),
  file("reference/arcs.yaml", [{ id: "arc_all", name: "All", chapters: [1, 139] }]),
  file("reference/eras.yaml", [
    { key: "all", name: "All", startYear: -3000, endYear: 3000, weight: 1 },
  ]),
];

function check(files: SourceFile[]): Issue[] {
  const { dataset, issues } = loadDataset(files);
  return [...issues, ...validateDataset(dataset)];
}

const errors = (issues: Issue[]) => issues.filter((issue) => issue.level === "error");
const messages = (issues: Issue[]) => errors(issues).map((issue) => issue.message);

describe("a valid dataset", () => {
  const files = [
    ...reference,
    character("character_a", {
      born: { date: { year: 830 }, ...fact() },
      edges: [
        { type: "holds", target: "titan_x", from: { event: "event_e" }, ...fact() },
        { type: "participated_in", target: "event_e", role: "lead", ...fact() },
      ],
    }),
    character("character_b", { edges: [{ type: "sibling_of", target: "character_a", ...fact() }] }),
    titan("titan_x"),
    event("event_e", 845),
  ];

  it("has no issues", () => {
    expect(check(files)).toEqual([]);
  });

  it("resolves edges to time intervals", () => {
    const { dataset } = loadDataset(files);
    const holds = toGraphInput(dataset).edges.find((e) => e.type === "holds");
    expect(holds?.own.start?.earliest).toBe(8_450_101);
  });

  it("makes a killing a moment: its event, or else the victim's death", () => {
    const { dataset } = loadDataset([
      ...reference,
      character("character_killer", {
        edges: [
          { type: "killed", target: "character_one", in: "event_battle", ...fact() },
          { type: "killed", target: "character_two", ...fact() },
        ],
      }),
      character("character_one"),
      character("character_two", { died: { date: { year: 852 }, ...fact() } }),
      event("event_battle", 850),
    ]);
    const [inEvent, atDeath] = toGraphInput(dataset).edges;
    expect(inEvent?.own).toEqual({
      start: { earliest: 8_500_101, latest: 8_501_231 },
      end: { earliest: 8_500_101, latest: 8_501_231 },
    });
    expect(atDeath?.own.start?.earliest).toBe(8_520_101);
    expect(atDeath?.own.end?.latest).toBe(8_521_231);
  });

  it("records the chapter that reveals each lifetime bound", () => {
    const { dataset } = loadDataset([
      ...reference,
      character("character_a", {
        died: { date: { year: 850 }, revealedIn: 30, sources: [30], certainty: "stated" },
      }),
    ]);
    const [node] = toGraphInput(dataset).nodes;
    expect(node?.lifetime).toMatchObject({ start: null, endRevealedIn: 30 });
    expect(node?.lifetime).not.toHaveProperty("startRevealedIn");
  });
});

describe("loading", () => {
  it("warns about missing reference files", () => {
    const issues = check([]);
    expect(errors(issues)).toEqual([]);
    expect(issues.map((issue) => issue.file)).toEqual([
      "reference/volumes.yaml",
      "reference/arcs.yaml",
      "reference/eras.yaml",
    ]);
  });

  it("requires the file name to match the ID", () => {
    const misnamed = { ...character("character_a"), path: "characters/character_z.yaml" };
    expect(messages(check([...reference, misnamed]))).toEqual([
      "file name must match the ID: rename to `character_a.yaml`",
    ]);
  });

  it("rejects files in the wrong place or with the wrong extension", () => {
    const issues = check([
      ...reference,
      { ...character("character_a"), path: "people/character_a.yaml" },
      { ...character("character_b"), path: "characters/character_b.yml" },
    ]);
    expect(errors(issues)).toHaveLength(2);
  });

  it("rejects an entity in the folder for another kind", () => {
    const misfiled = { ...titan("titan_x"), path: "characters/titan_x.yaml" };
    expect(messages(check([...reference, misfiled]))).toContain(
      "a character ID must start with `character_`",
    );
  });

  it("reports YAML syntax errors", () => {
    const broken = { path: "characters/character_a.yaml", content: "id: [unclosed" };
    expect(errors(check([...reference, broken]))).toHaveLength(1);
  });

  it("reports schema errors with their location", () => {
    const bad = character("character_a", { edges: [{ type: "holds", target: "titan_x" }] });
    const issue = errors(check([...reference, bad, titan("titan_x")]))[0];
    expect(issue?.path).toMatch(/^edges\[0\]/);
  });
});

describe("edge rules", () => {
  it("rejects unknown and retired targets", () => {
    const issues = check([
      ...reference,
      file("id-redirects.yaml", { character_old: "character_b" }),
      character("character_a", {
        edges: [
          { type: "sibling_of", target: "character_nobody", ...fact() },
          { type: "parent_of", target: "character_old", ...fact() },
        ],
      }),
      character("character_b"),
    ]);
    expect(messages(issues)).toEqual([
      "unknown entity `character_nobody`",
      "`character_old` was retired — use `character_b`",
    ]);
  });

  it("rejects targets of the wrong kind", () => {
    const issues = check([
      ...reference,
      character("character_a", { edges: [{ type: "holds", target: "character_b", ...fact() }] }),
      character("character_b"),
    ]);
    expect(messages(issues)).toEqual(["`holds` can't point to a character"]);
  });

  it("rejects edges revealed before their endpoints", () => {
    const issues = check([
      ...reference,
      character("character_a", {
        edges: [{ type: "sibling_of", target: "character_b", ...fact() }],
      }),
      character("character_b", { revealedIn: 40 }),
    ]);
    expect(messages(issues)).toEqual(["revealed in ch. 1, before `character_b` (ch. 40)"]);
  });

  it("stores symmetric edges once", () => {
    const issues = check([
      ...reference,
      character("character_a", {
        edges: [{ type: "sibling_of", target: "character_b", ...fact() }],
      }),
      character("character_b", {
        edges: [{ type: "sibling_of", target: "character_a", ...fact() }],
      }),
    ]);
    expect(errors(issues)).toHaveLength(1);
  });

  it("rejects parent_of cycles", () => {
    const issues = check([
      ...reference,
      character("character_a", {
        edges: [{ type: "parent_of", target: "character_b", ...fact() }],
      }),
      character("character_b", {
        edges: [{ type: "parent_of", target: "character_a", ...fact() }],
      }),
    ]);
    expect(messages(issues)).toEqual([
      "`parent_of` cycle: character_a → character_b → character_a",
    ]);
  });

  it("rejects explicit dates outside the endpoints' lifetimes", () => {
    const issues = check([
      ...reference,
      character("character_a", {
        died: { date: { year: 840 }, ...fact() },
        edges: [{ type: "holds", target: "titan_x", from: { year: 845 }, ...fact() }],
      }),
      titan("titan_x"),
    ]);
    expect(messages(issues)).toEqual([
      "`from`/`until` fall outside the lifetimes of the edge's endpoints",
    ]);
  });
});

describe("Titan holders", () => {
  const holds = (from: number) => ({
    type: "holds",
    target: "titan_x",
    from: { year: from },
    ...fact(),
  });

  it("rejects two holders at once", () => {
    const issues = check([
      ...reference,
      character("character_a", { edges: [holds(800)] }),
      character("character_b", { edges: [holds(820)] }),
      titan("titan_x"),
    ]);
    expect(errors(issues)).toHaveLength(1);
  });

  it("accepts a succession once the first holding ends", () => {
    const issues = check([
      ...reference,
      character("character_a", { died: { date: { year: 815 }, ...fact() }, edges: [holds(800)] }),
      character("character_b", { edges: [holds(820)] }),
      titan("titan_x"),
    ]);
    expect(errors(issues)).toEqual([]);
  });
});

describe("events and reference data", () => {
  it("warns when same-date events can't be ordered", () => {
    const issues = check([...reference, event("event_a", 850), event("event_b", 850)]);
    expect(issues.map((issue) => issue.level)).toEqual(["warning"]);
    expect(
      check([...reference, event("event_a", 850, { seq: 10 }), event("event_b", 850, { seq: 20 })]),
    ).toEqual([]);
  });

  it("requires arcs to cover every chapter without gaps", () => {
    const [volumes, , eras] = reference as [SourceFile, SourceFile, SourceFile];
    const arcs = file("reference/arcs.yaml", [
      { id: "arc_one", name: "One", chapters: [1, 50] },
      { id: "arc_two", name: "Two", chapters: [52, 139] },
    ]);
    expect(messages(check([volumes, arcs, eras]))).toEqual([
      "arc arc_two starts at ch. 52, expected ch. 51 (arcs must be in order, with no gaps or overlaps)",
    ]);
  });

  it("requires every date to fall inside an era", () => {
    const [volumes, arcs] = reference as [SourceFile, SourceFile];
    const eras = file("reference/eras.yaml", [
      { key: "early", name: "Early", startYear: 800, endYear: 844, weight: 1 },
      { key: "late", name: "Late", startYear: 845, endYear: 860, weight: 3 },
    ]);
    expect(messages(check([volumes, arcs, eras, event("event_a", 700)]))).toEqual([
      "has a date outside every era",
    ]);
  });
});

describe("generated JSON Schemas", () => {
  it("are up to date — run `pnpm schemas` if this fails", async () => {
    for (const [name, content] of generateSchemas()) {
      expect(await readFile(new URL(name, SCHEMA_DIR), "utf8"), name).toBe(content);
    }
  });
});
