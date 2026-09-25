import { describe, expect, it } from "vitest";
import {
  type TimelineItem,
  formatAtParam,
  formatMonth,
  fromMonthIndex,
  isLater,
  monthRange,
  parseAt,
  timelineRows,
  toMonthIndex,
} from "./time";

function item(id: string, date: unknown): TimelineItem {
  return {
    id,
    name: id,
    revealedIn: 1,
    seq: null,
    end: null,
    start:
      date === null ? null : ({ date, certainty: "stated", sources: [1] } as TimelineItem["start"]),
  };
}

describe("month indexes", () => {
  it("round-trip, including negative years", () => {
    for (const [year, month] of [
      [850, 1],
      [850, 12],
      [-1150, 6],
      [0, 1],
    ] as const) {
      expect(fromMonthIndex(toMonthIndex(year, month))).toEqual({ year, month });
    }
  });

  it("parse and format the `at` parameter", () => {
    expect(parseAt("850")).toBe(toMonthIndex(850, 1));
    expect(parseAt("850-03")).toBe(toMonthIndex(850, 3));
    expect(parseAt("-1150-06")).toBe(toMonthIndex(-1150, 6));
    expect(parseAt("850-13")).toBeNull();
    expect(parseAt(undefined)).toBeNull();
    expect(formatAtParam(toMonthIndex(850, 3))).toBe("850-03");
    expect(formatMonth(toMonthIndex(850, 3))).toBe("Mar 850");
  });
});

describe("timelineRows", () => {
  it("groups by year and collapses empty stretches", () => {
    const rows = timelineRows([
      item("a", { year: 844 }),
      item("b", { year: 845 }),
      item("c", { between: [{ year: 845 }, { year: 846 }] }),
      item("d", { year: 850 }),
      item("e", null),
    ]);
    expect(
      rows.map((r) =>
        r.kind === "gap" ? `gap ${String(r.years)}` : r.kind === "year" ? r.year : "undated",
      ),
    ).toEqual([844, 845, "gap 4", 850, "undated"]);
    expect(rows[1]).toMatchObject({ kind: "year", items: [{ id: "b" }, { id: "c" }] });
  });
});

describe("monthRange and isLater", () => {
  it("covers whole first and last years", () => {
    expect(monthRange([item("a", { year: 845 }), item("b", { year: 850, month: 3 })])).toEqual({
      min: toMonthIndex(845, 1),
      max: toMonthIndex(850, 12),
    });
    expect(monthRange([item("x", null)])).toBeNull();
  });

  it("treats undated items and 'no moment' as not later", () => {
    const at = toMonthIndex(847, 6);
    expect(isLater(item("a", { year: 850 }), at)).toBe(true);
    expect(isLater(item("b", { year: 845 }), at)).toBe(false);
    expect(isLater(item("c", null), at)).toBe(false);
    expect(isLater(item("d", { year: 850 }), null)).toBe(false);
  });
});
