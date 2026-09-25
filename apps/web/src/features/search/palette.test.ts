import { describe, expect, it } from "vitest";
import {
  type SearchItem,
  describeMatch,
  groupResults,
  markTerms,
  snippet,
  visibleRecent,
} from "./palette";

const result = (
  id: string,
  kind: SearchItem["kind"],
  extra: Partial<SearchItem> = {},
): SearchItem => ({
  id,
  kind,
  name: id,
  reason: "name",
  detail: id,
  score: 1,
  ...extra,
});

describe("groupResults", () => {
  it("puts the group with the strongest match first", () => {
    const groups = groupResults([
      result("event_best", "event", { score: 2 }),
      result("character_weak", "character", { score: 0.4 }),
    ]);
    expect(groups.map((g) => g.kind)).toEqual(["event", "character"]);
  });

  it("groups by kind in a fixed order on ties, keeping ranking inside groups", () => {
    const groups = groupResults([
      result("event_b", "event"),
      result("character_a", "character"),
      result("event_a", "event"),
    ]);
    expect(groups.map((g) => [g.kind, g.items.map((i) => i.id)])).toEqual([
      ["character", ["character_a"]],
      ["event", ["event_b", "event_a"]],
    ]);
  });
});

describe("visibleRecent", () => {
  it("drops entities the reader's chapter doesn't reveal", () => {
    const known = [{ id: "character_a", kind: "character" as const, name: "A" }];
    expect(visibleRecent(["character_hidden", "character_a"], known)).toEqual(known);
  });
});

describe("snippet", () => {
  it("centres on the first matching term", () => {
    const text = `${"x".repeat(100)} the boulder plugs the gate ${"y".repeat(100)}`;
    const excerpt = snippet(text, ["boulder"], 40);
    expect(excerpt).toContain("boulder");
    expect(excerpt.startsWith("…")).toBe(true);
    expect(excerpt.endsWith("…")).toBe(true);
  });

  it("leaves short text alone", () => {
    expect(snippet("Short.", ["short"])).toBe("Short.");
  });
});

describe("markTerms", () => {
  it("marks matches case-insensitively", () => {
    expect(markTerms("Battle of Trost", ["trost"])).toEqual([
      { text: "Battle of ", match: false },
      { text: "Trost", match: true },
    ]);
  });

  it("escapes regex characters in terms", () => {
    expect(markTerms("a.b", ["."])).toEqual([
      { text: "a", match: false },
      { text: ".", match: true },
      { text: "b", match: false },
    ]);
  });
});

describe("describeMatch", () => {
  it("explains each kind of match", () => {
    expect(
      describeMatch(result("x", "character", { name: "Eren Yeager", detail: "Eren Jaeger" }), []),
    ).toBe("Also known as “Eren Jaeger”");
    expect(
      describeMatch(result("x", "character", { name: "Levi", detail: "Levi" }), []),
    ).toBeNull();
    expect(
      describeMatch(result("x", "event", { reason: "connection", detail: "Trost District" }), []),
    ).toBe("Connected to Trost District");
    expect(describeMatch(result("x", "event", { reason: "year", detail: "850" }), [])).toBe(
      "In 850",
    );
  });
});
