import { z } from "zod";
import { idOfKind } from "./ids.ts";

// In-universe dates (docs/model/dates.md).

export const PointSchema = z
  .strictObject({
    year: z.int(),
    month: z.int().min(1).max(12).optional(),
    day: z.int().min(1).max(31).optional(),
  })
  .refine(
    (point) => point.day === undefined || point.month !== undefined,
    "`day` requires `month`",
  );
export type Point = z.infer<typeof PointSchema>;

export const BetweenSchema = z
  .strictObject({ between: z.tuple([PointSchema, PointSchema]) })
  .refine(
    ({ between: [first, second] }) => earliestOf(first) <= earliestOf(second),
    "the first date in `between` must not be later than the second",
  );
export type Between = z.infer<typeof BetweenSchema>;

export const InUniverseDateSchema = z.union([PointSchema, BetweenSchema]);
export type InUniverseDate = z.infer<typeof InUniverseDateSchema>;

/** A date, or a reference to an event's start or end (docs/model/dates.md §6). */
export const EventDateRefSchema = z.strictObject({
  event: idOfKind("event"),
  at: z.enum(["start", "end"]).default("start"),
});
export type EventDateRef = z.infer<typeof EventDateRefSchema>;

export const DateRefSchema = z.union([PointSchema, BetweenSchema, EventDateRefSchema]);
export type DateRef = z.infer<typeof DateRefSchema>;

/**
 * A resolved date: the inclusive range of moments it could refer to, as sortable integers
 * (`year × 10000 + month × 100 + day`; docs/model/dates.md §3).
 */
export interface DateRange {
  earliest: number;
  latest: number;
}

export function encodeBound(year: number, month: number, day: number): number {
  return year * 10_000 + month * 100 + day;
}

/** The year a bound falls in. Works for negative years too. */
export function yearOfBound(bound: number): number {
  return Math.floor(bound / 10_000);
}

function earliestOf(point: Point): number {
  return encodeBound(point.year, point.month ?? 1, point.day ?? 1);
}

function latestOf(point: Point): number {
  return encodeBound(point.year, point.month ?? 12, point.day ?? 31);
}

export function isBetween(date: InUniverseDate): date is Between {
  return "between" in date;
}

export function resolveDate(date: InUniverseDate): DateRange {
  if (isBetween(date)) {
    const [first, second] = date.between;
    return { earliest: earliestOf(first), latest: latestOf(second) };
  }
  return { earliest: earliestOf(date), latest: latestOf(date) };
}

/** Sort order for ranges: by earliest, then latest. */
export function compareRanges(a: DateRange, b: DateRange): number {
  return a.earliest - b.earliest || a.latest - b.latest;
}

export function sameRange(a: DateRange, b: DateRange): boolean {
  return a.earliest === b.earliest && a.latest === b.latest;
}
