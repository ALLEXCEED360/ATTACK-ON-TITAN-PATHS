import { describe, expect, it } from "vitest";
import { boundToYear, buildTimeScale, spreadEvents } from "./scale";

const bound = (year: number, month = 1, day = 1) => year * 10_000 + month * 100 + day;

describe("boundToYear", () => {
  it("turns encoded dates into fractional years, including negative years", () => {
    expect(boundToYear(bound(850))).toBe(850);
    expect(boundToYear(bound(850, 7))).toBeCloseTo(850.5);
    expect(boundToYear(bound(-1150, 1, 1))).toBe(-1150);
  });
});

describe("buildTimeScale", () => {
  // 844, 845, [846–849 empty], 850 over 0–1000px: 3 years + one 0.35 gap = 3.35 units.
  const scale = buildTimeScale([844, 845, 850], 0, 1000);
  const unit = 1000 / 3.35;

  it("gives each year with content equal width and compresses the gap", () => {
    expect(scale.ticks.map((t) => t.year)).toEqual([844, 845, 850]);
    expect(scale.ticks[0]?.width).toBeCloseTo(unit);
    expect(scale.gaps).toEqual([
      {
        x: expect.closeTo(2 * unit) as number,
        width: expect.closeTo(0.35 * unit) as number,
        years: 4,
      },
    ]);
  });

  it("maps dates inside years and clamps outside the range", () => {
    expect(scale.x(bound(844))).toBe(0);
    expect(scale.x(bound(845, 7))).toBeCloseTo(unit * 1.5);
    expect(scale.x(bound(850, 12, 31))).toBeGreaterThan(995); // the year's last day, near the end
    expect(scale.x(bound(900))).toBe(1000);
    expect(scale.x(bound(700))).toBe(0);
  });
});

describe("busy years", () => {
  it("get more room, up to a limit", () => {
    const scale = buildTimeScale([844, 850, 850, 850, 850], 0, 1000);
    const [quiet, busy] = scale.ticks;
    expect(busy?.width).toBeCloseTo((quiet?.width ?? 0) * 2); // 1 + log2(4) / 2
    const crowded = buildTimeScale([844, ...Array<number>(10_000).fill(850)], 0, 1000);
    expect(crowded.ticks[1]?.width).toBeCloseTo((crowded.ticks[0]?.width ?? 0) * 4);
  });
});

describe("spreadEvents", () => {
  it("spreads same-date events by seq and leaves undated ones out", () => {
    const scale = buildTimeScale([850], 0, 400);
    const positions = spreadEvents(
      [
        { id: "b", start: bound(850), end: bound(850, 12, 31), seq: 20 },
        { id: "a", start: bound(850), end: bound(850, 12, 31), seq: 10 },
        { id: "c", start: null, end: null, seq: null },
      ],
      scale,
    );
    expect(positions.get("c")).toBeUndefined();
    expect(positions.get("a")).toBeLessThan(positions.get("b") ?? 0);
  });
});
