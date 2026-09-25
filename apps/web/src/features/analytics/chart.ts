// Small, pure helpers shared by the analytics charts (docs/decisions/0009-analytics.md).

/** Evenly spaced axis ticks from 0 that reach at least `max`, stepping by 1, 2 or 5 × 10ⁿ. */
export function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0, 1];
  const rough = max / count;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) ?? 10 * magnitude;
  const ticks = [0];
  while ((ticks.at(-1) ?? 0) < max) ticks.push((ticks.at(-1) ?? 0) + Math.max(1, step));
  return ticks;
}

/**
 * The sequential brass ramp for magnitude, darkest first (validated against the dark card surface
 * with the dataviz palette validator). Zero has no step — it's drawn as an empty cell.
 */
export const HEAT_RAMP = ["#6b5527", "#8c6f30", "#b08b3a", "#d9b766"] as const;

/** Which ramp step a value falls in, or null for zero. */
export function heatStep(value: number, max: number): number | null {
  if (value <= 0 || max <= 0) return null;
  return Math.min(HEAT_RAMP.length - 1, Math.ceil((value / max) * HEAT_RAMP.length) - 1);
}

/** Text on the two lightest steps needs dark ink; on the darker ones, light ink. */
export function inkOn(step: number): string {
  return step >= 2 ? "var(--color-charcoal-950)" : "var(--color-parchment-100)";
}

/** The upper bound of each ramp step, for the legend ("1–2", "3", …). */
export function heatLegend(max: number): { step: number; label: string }[] {
  const steps: { step: number; label: string }[] = [];
  let from = 1;
  for (let step = 0; step < HEAT_RAMP.length; step++) {
    const to = Math.floor(((step + 1) / HEAT_RAMP.length) * max);
    if (to < from) continue;
    steps.push({ step, label: to === from ? String(to) : `${String(from)}–${String(to)}` });
    from = to + 1;
  }
  return steps;
}

/**
 * Factions worth a row in the co-participation heatmap: those that took part in at least one
 * event (the diagonal). The rest are listed separately rather than drawn as empty rows.
 */
export function splitFactions<T>(
  factions: readonly T[],
  matrix: readonly (readonly number[])[],
): { shown: { faction: T; index: number }[]; hidden: T[] } {
  const shown: { faction: T; index: number }[] = [];
  const hidden: T[] = [];
  factions.forEach((faction, index) => {
    if ((matrix[index]?.[index] ?? 0) > 0) shown.push({ faction, index });
    else hidden.push(faction);
  });
  return { shown, hidden };
}

/** A column with a rounded top (4px), anchored square to the baseline. */
export function columnPath(x: number, y: number, width: number, baseline: number): string {
  const r = Math.min(4, width / 2, baseline - y);
  return [
    `M${String(x)},${String(baseline)}`,
    `V${String(y + r)}`,
    `Q${String(x)},${String(y)} ${String(x + r)},${String(y)}`,
    `H${String(x + width - r)}`,
    `Q${String(x + width)},${String(y)} ${String(x + width)},${String(y + r)}`,
    `V${String(baseline)}`,
    "Z",
  ].join(" ");
}
