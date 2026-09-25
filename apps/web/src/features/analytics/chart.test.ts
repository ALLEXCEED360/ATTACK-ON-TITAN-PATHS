import { describe, expect, it } from "vitest";
import { columnPath, heatLegend, heatStep, niceTicks, splitFactions } from "./chart";

describe("niceTicks", () => {
  it("steps by 1, 2 or 5 and reaches the maximum", () => {
    expect(niceTicks(15)).toEqual([0, 5, 10, 15]);
    expect(niceTicks(12)).toEqual([0, 5, 10, 15]);
    expect(niceTicks(7)).toEqual([0, 2, 4, 6, 8]);
    expect(niceTicks(3)).toEqual([0, 1, 2, 3]);
  });

  it("never divides below whole numbers, and copes with nothing", () => {
    expect(niceTicks(1)).toEqual([0, 1]);
    expect(niceTicks(0)).toEqual([0, 1]);
  });
});

describe("heat ramp", () => {
  it("leaves zero empty and puts the maximum on the lightest step", () => {
    expect(heatStep(0, 6)).toBeNull();
    expect(heatStep(1, 6)).toBe(0);
    expect(heatStep(6, 6)).toBe(3);
    expect(heatStep(3, 6)).toBe(1);
  });

  it("labels each step with the values it covers, skipping empty steps", () => {
    expect(heatLegend(8)).toEqual([
      { step: 0, label: "1–2" },
      { step: 1, label: "3–4" },
      { step: 2, label: "5–6" },
      { step: 3, label: "7–8" },
    ]);
    expect(heatLegend(2)).toEqual([
      { step: 1, label: "1" },
      { step: 3, label: "2" },
    ]);
    // Every value lands in the step its legend claims.
    for (const max of [2, 5, 6, 8, 11]) {
      for (const { step, label } of heatLegend(max)) {
        const [from, to = from] = label.split("–").map(Number);
        expect(heatStep(from ?? 0, max)).toBe(step);
        expect(heatStep(to ?? 0, max)).toBe(step);
      }
    }
  });
});

describe("splitFactions", () => {
  it("hides factions that took part in no events", () => {
    const { shown, hidden } = splitFactions(
      ["a", "b", "c"],
      [
        [0, 0, 0],
        [0, 2, 1],
        [0, 1, 3],
      ],
    );
    expect(shown).toEqual([
      { faction: "b", index: 1 },
      { faction: "c", index: 2 },
    ]);
    expect(hidden).toEqual(["a"]);
  });
});

describe("columnPath", () => {
  it("rounds the top and keeps the base square", () => {
    const d = columnPath(10, 20, 24, 100);
    expect(d.startsWith("M10,100 V24")).toBe(true);
    expect(d.endsWith("V100 Z")).toBe(true);
  });

  it("never rounds more than the column is tall", () => {
    expect(columnPath(0, 98, 24, 100)).toContain("V100");
    expect(columnPath(0, 98, 24, 100)).toContain("Q0,98 2,98");
  });
});
