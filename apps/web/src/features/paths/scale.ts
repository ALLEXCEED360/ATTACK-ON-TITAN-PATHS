// The PATHS time axis. Years with something in them get equal width; empty stretches collapse to
// a narrow gap (the era idea from docs/model/dates.md §9, applied to what's on screen).

/** An encoded bound (year × 10000 + month × 100 + day) as a fractional year. */
export function boundToYear(bound: number): number {
  const year = Math.floor(bound / 10_000);
  const rest = bound - year * 10_000;
  const month = Math.floor(rest / 100);
  const day = rest - month * 100;
  return year + (Math.max(month, 1) - 1) / 12 + (Math.max(day, 1) - 1) / 372;
}

export interface TimeScale {
  /** Pixel position of an encoded bound. */
  x: (bound: number) => number;
  /** Axis marks: one per year shown, plus gap markers. */
  ticks: { kind: "year"; year: number; x: number; width: number }[];
  gaps: { x: number; width: number; years: number }[];
  left: number;
  right: number;
}

const GAP_SHARE = 0.35;
/** A busy year gets up to this many times the width of a quiet one. */
const MAX_YEAR_WEIGHT = 4;

/**
 * `years` lists every dated thing on screen by year; repeats make a year busier, and busier
 * years get more room (up to MAX_YEAR_WEIGHT), so crowded years stay legible.
 */
export function buildTimeScale(years: readonly number[], left: number, right: number): TimeScale {
  const counts = new Map<number, number>();
  for (const year of years) counts.set(year, (counts.get(year) ?? 0) + 1);
  const active = [...counts.keys()].sort((a, b) => a - b);
  if (active.length === 0) active.push(0);
  const weight = (year: number) =>
    Math.min(MAX_YEAR_WEIGHT, 1 + Math.log2(counts.get(year) ?? 1) / 2);

  // Units of width: 1 per active year, GAP_SHARE per run of empty years.
  const pieces: { from: number; to: number; units: number; gap: boolean }[] = [];
  active.forEach((year, i) => {
    const previous = active[i - 1];
    if (previous !== undefined && year - previous > 1) {
      pieces.push({ from: previous + 1, to: year, units: GAP_SHARE, gap: true });
    }
    pieces.push({ from: year, to: year + 1, units: weight(year), gap: false });
  });
  const total = pieces.reduce((sum, p) => sum + p.units, 0);
  const unit = (right - left) / total;

  let cursor = left;
  const placed = pieces.map((piece) => {
    const width = piece.units * unit;
    const start = cursor;
    cursor += width;
    return { ...piece, start, width };
  });

  const first = placed[0];
  const last = placed[placed.length - 1];
  const x = (bound: number) => {
    const t = boundToYear(bound);
    if (!first || !last) return left;
    if (t <= first.from) return left;
    if (t >= last.to) return right;
    const piece = placed.find((p) => t >= p.from && t < p.to) ?? last;
    return piece.start + ((t - piece.from) / (piece.to - piece.from)) * piece.width;
  };

  return {
    x,
    ticks: placed
      .filter((p) => !p.gap)
      .map((p) => ({ kind: "year" as const, year: p.from, x: p.start, width: p.width })),
    gaps: placed
      .filter((p) => p.gap)
      .map((p) => ({ x: p.start, width: p.width, years: p.to - p.from })),
    left,
    right,
  };
}

/**
 * Horizontal positions for events: events sharing a date spread across it in `seq` order, so
 * same-year events don't pile up (docs/model/dates.md §4).
 */
export interface TimedEvent {
  id: string;
  start: number | null;
  end: number | null;
  seq: number | null;
}

export function spreadEvents(events: readonly TimedEvent[], scale: TimeScale): Map<string, number> {
  const groups = new Map<string, TimedEvent[]>();
  for (const event of events) {
    if (event.start === null) continue;
    const key = `${String(event.start)}:${String(event.end ?? event.start)}`;
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }
  const positions = new Map<string, number>();
  for (const group of groups.values()) {
    group.sort((a, b) => (a.seq ?? Infinity) - (b.seq ?? Infinity) || a.id.localeCompare(b.id));
    const [sample] = group;
    if (sample?.start == null) continue;
    const from = scale.x(sample.start);
    const to = scale.x(sample.end ?? sample.start);
    const width = Math.max(to - from, 0);
    group.forEach((event, index) => {
      positions.set(
        event.id,
        width === 0 ? from : from + (width * (index + 1)) / (group.length + 1),
      );
    });
  }
  return positions;
}
