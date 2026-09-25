import { describe, expect, it } from "vitest";
import { CitationSchema, citationsCover } from "./chapters.ts";
import { EDGE_TYPES, EDGE_TYPE_NAMES } from "./edge-types.ts";
import { EDGE_SCHEMAS, EdgeInFileSchema } from "./edges.ts";
import { CharacterFileSchema, EventFileSchema } from "./entities.ts";
import { EntityIdSchema, kindOfId } from "./ids.ts";
import { displayName, searchableNames, visibleDescription } from "./text.ts";

const stated = { certainty: "stated" } as const;

describe("citations", () => {
  it("accept chapters 1–139 and ranges that go upwards", () => {
    expect(CitationSchema.safeParse(1).success).toBe(true);
    expect(CitationSchema.safeParse(139).success).toBe(true);
    expect(CitationSchema.safeParse([84, 86]).success).toBe(true);
    expect(CitationSchema.safeParse(0).success).toBe(false);
    expect(CitationSchema.safeParse(140).success).toBe(false);
    expect(CitationSchema.safeParse([86, 84]).success).toBe(false);
  });

  it("cover chapters inside ranges", () => {
    expect(citationsCover([12, [84, 86]], 85)).toBe(true);
    expect(citationsCover([12, [84, 86]], 87)).toBe(false);
  });
});

describe("IDs", () => {
  it("follow `<kind>_<slug>`", () => {
    expect(EntityIdSchema.safeParse("character_eren_yeager").success).toBe(true);
    expect(EntityIdSchema.safeParse("Character_Eren").success).toBe(false);
    expect(EntityIdSchema.safeParse("character__eren").success).toBe(false);
    expect(EntityIdSchema.safeParse("person_eren").success).toBe(false);
  });

  it("know their kind", () => {
    expect(kindOfId("event_battle_of_trost")).toBe("event");
    expect(kindOfId("nonsense")).toBeUndefined();
  });
});

describe("edge schemas", () => {
  it("cover every edge type exactly once", () => {
    const covered = EDGE_SCHEMAS.map((schema) => schema.shape.type.value);
    expect([...covered].sort()).toEqual([...EDGE_TYPE_NAMES].sort());
  });

  it("allow from/until exactly on time-bounded types", () => {
    for (const schema of EDGE_SCHEMAS) {
      const type = schema.shape.type.value;
      expect("from" in schema.shape, type).toBe(EDGE_TYPES[type].timeBounded);
      expect("until" in schema.shape, type).toBe(EDGE_TYPES[type].timeBounded);
    }
  });

  it("reject time bounds on types that have none", () => {
    const edge = {
      type: "parent_of",
      target: "character_eren_yeager",
      revealedIn: 1,
      sources: [1],
      from: { year: 835 },
      ...stated,
    };
    expect(EdgeInFileSchema.safeParse(edge).success).toBe(false);
  });

  it("require the reveal chapter to be cited", () => {
    const edge = {
      type: "holds",
      target: "titan_attack",
      revealedIn: 20,
      sources: [21, [30, 32]],
      ...stated,
    };
    expect(EdgeInFileSchema.safeParse(edge).success).toBe(false);
    expect(EdgeInFileSchema.safeParse({ ...edge, sources: [[19, 21]] }).success).toBe(true);
  });

  it("require notes on inferred facts", () => {
    const edge = {
      type: "holds",
      target: "titan_attack",
      revealedIn: 20,
      sources: [20],
      certainty: "inferred",
    };
    expect(EdgeInFileSchema.safeParse(edge).success).toBe(false);
    expect(EdgeInFileSchema.safeParse({ ...edge, notes: "Because…" }).success).toBe(true);
  });
});

describe("entity files", () => {
  const character = {
    id: "character_krista_lenz",
    names: [
      { name: "Krista Lenz", revealedIn: 10 },
      { name: "Historia Reiss", revealedIn: 50 },
    ],
    revealedIn: 10,
    sources: [10, 50],
  };

  it("accept a minimal valid character and fill defaults", () => {
    const parsed = CharacterFileSchema.parse(character);
    expect(parsed.description).toEqual([]);
    expect(parsed.edges).toEqual([]);
  });

  it("reject an ID of the wrong kind", () => {
    expect(CharacterFileSchema.safeParse({ ...character, id: "event_x" }).success).toBe(false);
  });

  it("reject names out of reveal order", () => {
    const names = [...character.names].reverse();
    expect(CharacterFileSchema.safeParse({ ...character, names }).success).toBe(false);
  });

  it("reject a first name revealed later than the entity", () => {
    const names = [{ name: "Krista Lenz", revealedIn: 50 }];
    expect(CharacterFileSchema.safeParse({ ...character, names }).success).toBe(false);
  });

  it("reject a death before birth", () => {
    const dates = {
      born: { date: { year: 850 }, revealedIn: 10, sources: [10], ...stated },
      died: { date: { year: 845 }, revealedIn: 10, sources: [10], ...stated },
    };
    expect(CharacterFileSchema.safeParse({ ...character, ...dates }).success).toBe(false);
  });

  it("reject an event that ends before it starts", () => {
    const event = {
      id: "event_example",
      names: [{ name: "Example", revealedIn: 5 }],
      revealedIn: 5,
      sources: [5],
      start: { date: { year: 850 }, revealedIn: 5, sources: [5], ...stated },
      end: { date: { year: 849 }, revealedIn: 5, sources: [5], ...stated },
    };
    expect(EventFileSchema.safeParse(event).success).toBe(false);
  });
});

describe("spoiler-aware text", () => {
  const names = [
    { name: "Krista Lenz", revealedIn: 10 },
    { name: "Historia Reiss", revealedIn: 50, variants: ["Historia"] },
  ];

  it("shows the last name revealed by the cutoff", () => {
    expect(displayName(names, 9)).toBeUndefined();
    expect(displayName(names, 10)).toBe("Krista Lenz");
    expect(displayName(names, 49)).toBe("Krista Lenz");
    expect(displayName(names, 50)).toBe("Historia Reiss");
  });

  it("never lets unrevealed names be searched", () => {
    expect(searchableNames(names, 20)).toEqual(["Krista Lenz"]);
    expect(searchableNames(names, 139)).toEqual(["Krista Lenz", "Historia Reiss", "Historia"]);
  });

  it("shows only revealed description segments", () => {
    const description = [
      { text: "First", revealedIn: 1 },
      { text: "Later", revealedIn: 72 },
    ];
    expect(visibleDescription(description, 71)).toEqual(["First"]);
  });
});
