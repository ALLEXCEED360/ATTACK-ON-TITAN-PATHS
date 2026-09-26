import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ARTWORK, artworkAt, heroArt } from "./manifest";

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
    expect(artworkAt(1).map((a) => a.id)).toEqual(["walls-map"]);
    expect(artworkAt(13).every((a) => a.revealedIn <= 13)).toBe(true);
    expect(artworkAt(3, "character_mikasa_ackerman")).toEqual([]);
    expect(artworkAt(14, "character_mikasa_ackerman").map((a) => a.id)).toEqual([
      "mikasa-rooftops",
      "volume-3",
    ]);
  });

  it("picks the most recent hero art, honouring preferences, never the map", () => {
    expect(heroArt(1)).toBeUndefined();
    expect(heroArt(5)?.id).toBe("colossal-arm");
    expect(heroArt(139)?.id).toBe("mikasa-rooftops");
    expect(heroArt(139, ["titan-horde"])?.id).toBe("titan-horde");
    expect(heroArt(5, ["titan-horde"])?.id).toBe("colossal-arm");
  });
});
