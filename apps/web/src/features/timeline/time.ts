import type { Timeline } from "../../api/client";
import { formatYear } from "../../lib/format";

// Time arithmetic for the timeline and the time slider. Months are the slider's unit: fine enough
// for the story's dated events, and every date in the data resolves to a month range.

export type TimelineItem = Timeline["items"][number];

interface Point {
  year: number;
  month?: number;
}

/** A month as one sortable integer. Works for negative years too. */
export function toMonthIndex(year: number, month = 1): number {
  return year * 12 + (month - 1);
}

export function fromMonthIndex(index: number): { year: number; month: number } {
  const year = Math.floor(index / 12);
  return { year, month: index - year * 12 + 1 };
}

/** The earliest point an item's start date could refer to, or null if its date isn't revealed. */
function earliestPoint(item: TimelineItem): Point | null {
  if (!item.start) return null;
  const date = item.start.date as Point | { between: [Point, Point] };
  return "between" in date ? date.between[0] : date;
}

export function startMonth(item: TimelineItem): number | null {
  const point = earliestPoint(item);
  return point ? toMonthIndex(point.year, point.month) : null;
}

export function startYear(item: TimelineItem): number | null {
  return earliestPoint(item)?.year ?? null;
}

/** First and last month covered by the items' dates (the slider's range). */
export function monthRange(items: readonly TimelineItem[]): { min: number; max: number } | null {
  const years = items.flatMap((item) => {
    const year = startYear(item);
    return year === null ? [] : [year];
  });
  if (years.length === 0) return null;
  return { min: toMonthIndex(Math.min(...years), 1), max: toMonthIndex(Math.max(...years), 12) };
}

/** `at` query value ↔ month index. The API accepts `YYYY` or `YYYY-MM`. */
export function parseAt(at: string | undefined): number | null {
  const match = at ? /^(-?\d+)(?:-(\d{1,2}))?/.exec(at) : null;
  if (!match) return null;
  const month = match[2] ? Number(match[2]) : 1;
  return month >= 1 && month <= 12 ? toMonthIndex(Number(match[1]), month) : null;
}

export function formatAtParam(index: number): string {
  const { year, month } = fromMonthIndex(index);
  return `${String(year)}-${String(month).padStart(2, "0")}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatMonth(index: number): string {
  const { year, month } = fromMonthIndex(index);
  return `${MONTHS[month - 1] ?? ""} ${formatYear(year)}`;
}

/** Whether an item starts after the chosen moment (shown dimmed: it hasn't happened yet). */
export function isLater(item: TimelineItem, at: number | null): boolean {
  const start = startMonth(item);
  return at !== null && start !== null && start > at;
}

export type TimelineRow =
  | { kind: "year"; year: number; items: TimelineItem[] }
  | { kind: "gap"; years: number }
  | { kind: "undated"; items: TimelineItem[] };

/**
 * World-order rows: one block per year that has events, with empty stretches collapsed into a
 * single "gap" row. This is the era idea in miniature: busy years get space, quiet ones don't.
 */
export function timelineRows(items: readonly TimelineItem[]): TimelineRow[] {
  const rows: TimelineRow[] = [];
  const undated: TimelineItem[] = [];
  let previous: number | null = null;

  for (const item of items) {
    const year = startYear(item);
    if (year === null) {
      undated.push(item);
      continue;
    }
    const last = rows.at(-1);
    if (last?.kind === "year" && last.year === year) {
      last.items.push(item);
      continue;
    }
    if (previous !== null && year - previous > 1)
      rows.push({ kind: "gap", years: year - previous - 1 });
    rows.push({ kind: "year", year, items: [item] });
    previous = year;
  }

  if (undated.length > 0) rows.push({ kind: "undated", items: undated });
  return rows;
}
