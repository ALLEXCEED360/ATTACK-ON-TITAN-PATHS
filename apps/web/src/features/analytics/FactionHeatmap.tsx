import { useState } from "react";
import { Link } from "react-router";
import type { Analytics } from "../../api/client";
import { ChartCard, DataTable } from "./ChartCard";
import { HEAT_RAMP, heatLegend, heatStep, inkOn, splitFactions } from "./chart";

const CELL = 44;

/**
 * Faction co-participation as a lower-triangle heatmap (the matrix is symmetric). The diagonal is
 * each faction's own count. Built as a real table, so screen readers can walk it cell by cell.
 */
export function FactionHeatmap({
  factions,
  matrix,
}: {
  factions: Analytics["factions"];
  matrix: Analytics["factionMatrix"];
}) {
  const [hover, setHover] = useState<{ row: number; col: number } | null>(null);
  const { shown, hidden } = splitFactions(factions, matrix);
  const max = Math.max(0, ...matrix.flat());
  const value = (a: number, b: number) => matrix[a]?.[b] ?? 0;
  const title = "Factions side by side";
  const caption =
    "Events in which members of both factions took part, counting members only while they belonged.";

  if (shown.length === 0) {
    return (
      <ChartCard
        title={title}
        caption={caption}
        chart={
          <p className="text-sm text-parchment-500">No faction has taken part in an event yet.</p>
        }
      />
    );
  }

  const hoveredText = (() => {
    if (!hover) return null;
    const a = shown[hover.row];
    const b = shown[hover.col];
    if (!a || !b) return null;
    const n = value(a.index, b.index);
    const events = `${String(n)} ${n === 1 ? "event" : "events"}`;
    return a.index === b.index
      ? `${a.faction.name} took part in ${events}`
      : `${a.faction.name} and ${b.faction.name}: ${events} together`;
  })();

  const chart = (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto">
        <table className="border-separate border-spacing-0.5 text-xs">
          <thead>
            <tr>
              <td />
              {shown.map(({ faction }) => (
                <th
                  key={faction.id}
                  scope="col"
                  className="h-36 text-center align-bottom font-normal text-parchment-300"
                  style={{ width: CELL }}
                >
                  <span className="inline-block max-h-36 rotate-180 pb-1 text-left [writing-mode:vertical-rl]">
                    {faction.name}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((row, r) => (
              <tr key={row.faction.id}>
                <th scope="row" className="max-w-40 pr-2 text-right font-normal text-parchment-300">
                  {row.faction.name}
                </th>
                {shown.map((col, c) => {
                  if (c > r) return <td key={col.faction.id} />;
                  const n = value(row.index, col.index);
                  const step = heatStep(n, max);
                  const on = hover?.row === r && hover.col === c;
                  return (
                    <td
                      key={col.faction.id}
                      className={`rounded text-center font-semibold tabular-nums ${on ? "outline-2 outline-parchment-100" : ""} ${step === null ? "text-parchment-500" : ""}`}
                      style={{
                        width: CELL,
                        height: CELL,
                        background: step === null ? "var(--color-charcoal-800)" : HEAT_RAMP[step],
                        color: step === null ? undefined : inkOn(step),
                        boxShadow:
                          r === c ? "inset 0 0 0 1px var(--color-charcoal-950)" : undefined,
                      }}
                      onPointerEnter={() => {
                        setHover({ row: r, col: c });
                      }}
                      onPointerLeave={() => {
                        setHover(null);
                      }}
                    >
                      {n}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="min-h-4 text-xs text-parchment-100">
        {hoveredText ?? <span className="text-parchment-500">Point at a square for details.</span>}
      </p>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-parchment-500">
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="h-3 w-3 rounded-sm border border-charcoal-600 bg-charcoal-800"
          />
          none
        </span>
        {heatLegend(max).map(({ step, label }) => (
          <span key={step} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="h-3 w-3 rounded-sm"
              style={{ background: HEAT_RAMP[step] }}
            />
            {label}
          </span>
        ))}
        <span>events</span>
      </div>

      {hidden.length > 0 && (
        <p className="text-xs text-parchment-500">
          Not shown, with no recorded events as a group yet: {hidden.map((f) => f.name).join(", ")}.
        </p>
      )}
    </div>
  );

  const pairs = shown.flatMap((a, r) =>
    shown.slice(0, r + 1).map((b) => ({ a: a.faction, b: b.faction, n: value(a.index, b.index) })),
  );
  const table = (
    <DataTable
      columns={[{ label: "Faction" }, { label: "With" }, { label: "Events", numeric: true }]}
      rows={pairs
        .sort((x, y) => y.n - x.n)
        .map(({ a, b, n }) => ({
          key: `${a.id}-${b.id}`,
          cells: [
            <Link key="a" to={`/entity/${a.id}`} className="hover:text-brass-300">
              {a.name}
            </Link>,
            a.id === b.id ? (
              <span key="b" className="text-parchment-500">
                (on its own)
              </span>
            ) : (
              <Link key="b" to={`/entity/${b.id}`} className="hover:text-brass-300">
                {b.name}
              </Link>
            ),
            n,
          ],
        }))}
    />
  );

  return <ChartCard title={title} caption={caption} chart={chart} table={table} />;
}
