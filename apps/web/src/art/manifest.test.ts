import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ARTWORK, artworkAt, heroArt, portraitOf, portraitsOf } from "./manifest";

// Tests run from apps/web.
const publicDir = resolve("public");

describe("artwork manifest", () => {
  it("points at files that exist, each credited", () => {
    for (const art of ARTWORK) {
      expect(existsSync(`${publicDir}${art.src}`), art.src).toBe(true);
      expect(art.credit.artist.length).toBeGreaterThan(0);
      expect(art.alt.length).toBeGreaterThan(10);
      if (art.credit.kind === "fan") expect(art.credit.url, art.id).toBeDefined();
    }
  });

  it("has unique ids", () => {
    expect(new Set(ARTWORK.map((a) => a.id)).size).toBe(ARTWORK.length);
  });

  it("never shows art before its chapter", () => {
    expect(
      artworkAt(1)
        .filter((a) => a.kind === "illustration")
        .map((a) => a.id),
    ).toEqual(["walls-map"]);
    expect(artworkAt(13).every((a) => a.revealedIn <= 13)).toBe(true);
    expect(
      artworkAt(14, "character_mikasa_ackerman")
        .filter((a) => a.kind === "illustration")
        .map((a) => a.id),
    ).toEqual(["mikasa-rooftops", "volume-3"]);
  });

  it("shows a portrait only once its subject is revealed", () => {
    expect(portraitOf(18, "character_levi")).toBeUndefined();
    expect(portraitOf(19, "character_levi")?.src).toBe("/art/characters/character_levi.webp");
    expect(portraitOf(22, "titan_female")).toBeUndefined();
    expect(portraitOf(23, "titan_female")).toBeDefined();
    // Eren's Titan form joins his portraits later; his plain likeness stays first.
    expect(portraitsOf(10, "character_eren_yeager").map((a) => a.id)).toEqual([
      "character_eren_yeager",
    ]);
    expect(portraitsOf(11, "character_eren_yeager").map((a) => a.id)).toEqual([
      "character_eren_yeager",
      "eren-titan",
    ]);
    expect(portraitOf(139, "character_eren_yeager")?.id).toBe("character_eren_yeager");
  });

  it("shows a volume cover only after its last chapter", () => {
    const covers = (cutoff: number) =>
      artworkAt(cutoff)
        .filter((a) => a.kind === "cover")
        .map((a) => a.id);
    expect(covers(3)).toEqual([]);
    expect(covers(4)).toEqual(["volume-01"]);
    expect(covers(50)).toHaveLength(12);
  });

  it("picks the most recent hero art, honouring preferences, never the map", () => {
    expect(heroArt(1)).toBeUndefined();
    expect(heroArt(5)?.id).toBe("colossal-arm");
    expect(heroArt(139)?.id).toBe("mikasa-rooftops");
    expect(heroArt(139, ["titan-horde"])?.id).toBe("titan-horde");
    expect(heroArt(5, ["titan-horde"])?.id).toBe("colossal-arm");
  });
});
