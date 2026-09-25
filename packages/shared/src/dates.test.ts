import { describe, expect, it } from "vitest";
import {
  BetweenSchema,
  DateRefSchema,
  PointSchema,
  compareRanges,
  encodeBound,
  resolveDate,
  yearOfBound,
} from "./dates.ts";

describe("resolveDate", () => {
  it("resolves a year to the whole year", () => {
    expect(resolveDate({ year: 850 })).toEqual({
      earliest: encodeBound(850, 1, 1),
      latest: encodeBound(850, 12, 31),
    });
  });

  it("resolves a month to the whole month", () => {
    expect(resolveDate({ year: 850, month: 3 })).toEqual({
      earliest: encodeBound(850, 3, 1),
      latest: encodeBound(850, 3, 31),
    });
  });

  it("resolves a day to itself", () => {
    const day = encodeBound(850, 3, 10);
    expect(resolveDate({ year: 850, month: 3, day: 10 })).toEqual({ earliest: day, latest: day });
  });

  it("resolves a between range from the start of the first to the end of the second", () => {
    expect(resolveDate({ between: [{ year: 743 }, { year: 745 }] })).toEqual({
      earliest: encodeBound(743, 1, 1),
      latest: encodeBound(745, 12, 31),
    });
  });
});

describe("bounds", () => {
  it("sort correctly across negative years", () => {
    const years = [-1151, -1150, -1, 0, 1, 845];
    const bounds = years.flatMap((year) => [encodeBound(year, 1, 1), encodeBound(year, 12, 31)]);
    expect([...bounds].sort((a, b) => a - b)).toEqual(bounds);
  });

  it("recover the year, including negative years", () => {
    expect(yearOfBound(encodeBound(-1150, 1, 1))).toBe(-1150);
    expect(yearOfBound(encodeBound(-1150, 12, 31))).toBe(-1150);
    expect(yearOfBound(encodeBound(850, 6, 15))).toBe(850);
  });

  it("compare ranges by earliest, then latest", () => {
    const year = resolveDate({ year: 850 });
    const march = resolveDate({ year: 850, month: 3 });
    expect(compareRanges(year, march)).toBeLessThan(0);
  });
});

describe("date schemas", () => {
  it("rejects a day without a month", () => {
    expect(PointSchema.safeParse({ year: 850, day: 3 }).success).toBe(false);
  });

  it("rejects a between range that runs backwards", () => {
    expect(BetweenSchema.safeParse({ between: [{ year: 850 }, { year: 845 }] }).success).toBe(
      false,
    );
  });

  it("rejects unknown fields", () => {
    expect(PointSchema.safeParse({ year: 850, approx: true }).success).toBe(false);
  });

  it("defaults an event reference to the event's start", () => {
    expect(DateRefSchema.parse({ event: "event_battle_of_trost" })).toEqual({
      event: "event_battle_of_trost",
      at: "start",
    });
  });

  it("only accepts event IDs in event references", () => {
    expect(DateRefSchema.safeParse({ event: "character_eren_yeager" }).success).toBe(false);
  });
});
