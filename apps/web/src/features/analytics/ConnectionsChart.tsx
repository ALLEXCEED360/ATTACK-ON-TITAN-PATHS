import { useState } from "react";
import { Link } from "react-router";
import type { Analytics } from "../../api/client";
import { formatYear } from "../../lib/format";
import { useWidth } from "../../lib/useWidth";
import { ChartCard, DataTable, Tooltip } from "./ChartCard";
import { niceTicks } from "./chart";

type Series = Analytics["connections"][number];

const HEIGHT = 260;
const MARGIN = { top: 16, right: 16, bottom: 28, left: 32 };

/**
 * Connections over time, in emphasis form: one character in brass, everyone else as grey
 * context. Pick who's emphasised from the legend; hover the plot for every value in a year.
 */
export function ConnectionsChart({ years, series }: { years: number[]; series: Series[] }) {
  const [selected, setSelected] = useState(series[0]?.id);
  const [preview, setPreview] = useState<string>();
  const [hover, setHover] = useState<number | null>(null);
  const [ref, width] = useWidth<HTMLDivElement>(640);

  const active = preview ?? (series.some((s) => s.id === selected) ? selected : series[0]?.id);
  const title = "Connections over time";
  const caption = "Relationships active each year, for the most connected characters.";

  if (years.length < 2 || series.length === 0) {
    return (
      <ChartCard
        title={title}
        caption={caption}
        chart={
          <p className="text-sm text-parchment-500">
            Read further — this needs events in at least two different years.
          </p>
        }
      />
    );
  }

  const ticks = niceTicks(Math.max(...series.flatMap((s) => s.perYear)));
  const top = ticks.at(-1) ?? 1;
  const plotW = Math.max(1, width - MARGIN.left - MARGIN.right);
  const plotH = HEIGHT - MARGIN.top - MARGIN.bottom;
  const x = (i: number) => MARGIN.left + (i * plotW) / (years.length - 1);
  const y = (v: number) => MARGIN.top + plotH - (v / top) * plotH;
  const line = (values: number[]) =>
    values.map((v, i) => `${i ? "L" : "M"}${String(x(i))},${String(y(v))}`).join(" ");

  const emphasised = series.find((s) => s.id === active);
  const context = series.filter((s) => s.id !== active);
  const labelEvery = Math.ceil((years.length * 44) / plotW);

  const chart = (
    <div className="flex flex-col gap-4">
      <div ref={ref} className="relative">
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label={`Line chart of relationships per year from ${formatYear(years[0] ?? 0)} to ${formatYear(years.at(-1) ?? 0)}. Switch to the table for the values.`}
          className="block overflow-visible"
        >
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={MARGIN.left}
                x2={MARGIN.left + plotW}
                y1={y(t)}
                y2={y(t)}
                stroke="var(--color-charcoal-700)"
                strokeWidth={1}
              />
              <text
                x={MARGIN.left - 8}
                y={y(t)}
                dy="0.32em"
                textAnchor="end"
                className="fill-parchment-500 font-mono text-[10px]"
              >
                {t}
              </text>
            </g>
          ))}
          {years.map((year, i) =>
            i % labelEvery === 0 || i === years.length - 1 ? (
              <text
                key={year}
                x={x(i)}
                y={HEIGHT - 8}
                textAnchor="middle"
                className="fill-parchment-500 font-mono text-[10px]"
              >
                {formatYear(year)}
              </text>
            ) : null,
          )}

          {hover !== null && (
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={MARGIN.top}
              y2={MARGIN.top + plotH}
              stroke="var(--color-parchment-500)"
              strokeWidth={1}
              strokeOpacity={0.6}
            />
          )}

          {context.map((s) => (
            <path
              key={s.id}
              d={line(s.perYear)}
              fill="none"
              stroke="var(--color-parchment-500)"
              strokeOpacity={0.3}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}
          {emphasised && (
            <>
              <path
                d={line(emphasised.perYear)}
                fill="none"
                stroke="var(--color-brass-300)"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {emphasised.perYear.map((v, i) => (
                <circle
                  key={years[i]}
                  cx={x(i)}
                  cy={y(v)}
                  r={hover === i ? 5 : 4}
                  fill="var(--color-brass-300)"
                  stroke="var(--color-charcoal-900)"
                  strokeWidth={2}
                />
              ))}
            </>
          )}

          {/* The hit area is the whole plot, so the crosshair follows the pointer anywhere. */}
          <rect
            x={MARGIN.left - 12}
            y={MARGIN.top}
            width={plotW + 24}
            height={plotH}
            fill="transparent"
            onPointerMove={(e) => {
              const left = e.currentTarget.getBoundingClientRect().left + 12;
              const i = Math.round(((e.clientX - left) / plotW) * (years.length - 1));
              setHover(Math.max(0, Math.min(years.length - 1, i)));
            }}
            onPointerLeave={() => {
              setHover(null);
            }}
          />
        </svg>

        {hover !== null && (
          <Tooltip x={x(hover)} y={MARGIN.top} flip={x(hover) > width / 2}>
            <p className="mb-1 font-mono text-parchment-500">{formatYear(years[hover] ?? 0)}</p>
            <ul className="flex flex-col gap-0.5">
              {[...series]
                .sort((a, b) => (b.perYear[hover] ?? 0) - (a.perYear[hover] ?? 0))
                .map((s) => (
                  <li
                    key={s.id}
                    className={`flex justify-between gap-4 ${s.id === active ? "font-semibold text-parchment-100" : "text-parchment-300"}`}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className={`h-0.5 w-3 rounded ${s.id === active ? "bg-brass-300" : "bg-parchment-500/40"}`}
                      />
                      {s.name}
                    </span>
                    <span className="tabular-nums">{s.perYear[hover]}</span>
                  </li>
                ))}
            </ul>
          </Tooltip>
        )}
      </div>

      <ul aria-label="Emphasise a character" className="flex flex-wrap gap-2">
        {series.map((s) => {
          const on = s.id === active;
          return (
            <li key={s.id}>
              <button
                type="button"
                aria-pressed={s.id === selected}
                onClick={() => {
                  setSelected(s.id);
                }}
                onPointerEnter={() => {
                  setPreview(s.id);
                }}
                onPointerLeave={() => {
                  setPreview(undefined);
                }}
                onFocus={() => {
                  setPreview(s.id);
                }}
                onBlur={() => {
                  setPreview(undefined);
                }}
                className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition-colors ${
                  on
                    ? "border-brass-500 bg-charcoal-800 text-parchment-100"
                    : "border-charcoal-600 text-parchment-300 hover:border-parchment-500"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`h-0.5 w-4 rounded ${on ? "bg-brass-300" : "bg-parchment-500/40"}`}
                />
                {s.name}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );

  const table = (
    <DataTable
      columns={[
        { label: "Character" },
        ...years.map((year) => ({ label: formatYear(year), numeric: true })),
      ]}
      rows={series.map((s) => ({
        key: s.id,
        cells: [
          <Link key="name" to={`/entity/${s.id}`} className="hover:text-brass-300">
            {s.name}
          </Link>,
          ...s.perYear.map((v) => v),
        ],
      }))}
    />
  );

  return (
    <ChartCard
      title={title}
      caption={caption}
      chart={chart}
      table={table}
      className="lg:col-span-2"
    />
  );
}
