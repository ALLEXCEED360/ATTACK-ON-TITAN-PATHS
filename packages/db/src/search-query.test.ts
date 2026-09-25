import { describe, expect, it } from "vitest";
import { parseQuery } from "./search-query.ts";

describe("parseQuery", () => {
  it("separates words from a year", () => {
    expect(parseQuery("Shiganshina 850")).toEqual({ terms: ["shiganshina"], year: 850 });
    expect(parseQuery("year -1150 ymir")).toEqual({ terms: ["year", "ymir"], year: -1150 });
  });

  it("drops stopwords, punctuation, duplicates and single letters", () => {
    expect(parseQuery("  The Battle of Trost!  trost x ")).toEqual({
      terms: ["battle", "trost"],
      year: null,
    });
  });

  it("keeps apostrophes out of terms", () => {
    expect(parseQuery("Eren's")).toEqual({ terms: ["erens"], year: null });
  });

  it("returns nothing searchable for empty input", () => {
    expect(parseQuery("   ")).toEqual({ terms: [], year: null });
  });
});
