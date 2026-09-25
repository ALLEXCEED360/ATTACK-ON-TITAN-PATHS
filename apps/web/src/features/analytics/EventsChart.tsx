import { Fragment, useState } from "react";
import { Link } from "react-router";
import type { Analytics } from "../../api/client";
import { formatYear } from "../../lib/format";
import { useWidth } from "../../lib/useWidth";
import { ChartCard, DataTable, Tooltip } from "./ChartCard";
import { columnPath } from "./chart";

const HEIGHT = 220;
const MARGIN = { top: 24, right: 4, bottom: 28, left: 4 };
const MAX_LISTED = 8;

/** Events per in-universe year: one column per year, empty years kept so gaps stay honest. */
export function EventsChart({ data }: { data: Analytics["eventsPerYear"] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [ref, width] = useWidth<HTMLDivElement>(420);
  const title = "Events per year";
  const caption = "Dated events you've read about, by the year they happened.";

  if (data.length === 0) {
    return (
      <ChartCard
        title={title}
        caption={caption}
        chart={<p className="text-sm text-parchment-500">No dated events yet.</p>}
      />
    );
  }

  const top = Math.max(1, ...data.map((d) => d.events.length));
  const plotW = Math.max(1, width - MARGIN.left - MARGIN.right);
  const plotH = HEIGHT - MARGIN.top - MARGIN.bottom;
  const band = plotW / data.length;
  const barW = Math.min(24, band * 0.6);
  const baseline = MARGIN.top + plotH;
  const barX = (i: number) => MARGIN.left + i * band + (band - barW) / 2;
  const barY = (n: number) => baseline - (n / top) * plotH;
  const labelEvery = Math.ceil(44 / band);
  const hovered = hover === null ? undefined : data[hover];

  const chart = (
    <div ref={ref} className="relative">
      <svg
        width={width}
        height={HEIGHT}
        role="img"
        aria-label="Column chart of events per year. Switch to the table for the values and event names."
        className="block"
      >
        <line
          x1={MARGIN.left}
          x2={MARGIN.left + plotW}
          y1={baseline}
          y2={baseline}
          stroke="var(--color-charcoal-600)"
          strokeWidth={1}
        />
        {data.map((d, i) => {
          const n = d.events.length;
          const on = hover === i;
          return (
            <Fragment key={d.year}>
              {n > 0 && (
                <path
                  d={columnPath(barX(i), barY(n), barW, baseline)}
                  fill={on ? "var(--color-brass-300)" : "var(--color-brass-500)"}
                />
              )}
              <text
                x={barX(i) + barW / 2}
                y={barY(n) - 6}
                textAnchor="middle"
                className={`font-mono text-[11px] ${n > 0 ? "fill-parchment-100" : "fill-parchment-500"}`}
              >
                {n}
              </text>
              {(i % labelEvery === 0 || i === data.length - 1) && (
                <text
                  x={barX(i) + barW / 2}
                  y={HEIGHT - 8}
                  textAnchor="middle"
                  className={`font-mono text-[10px] ${on ? "fill-parchment-100" : "fill-parchment-500"}`}
                >
                  {formatYear(d.year)}
                </text>
              )}
              {/* The whole column band is the hit target, not just the bar. */}
              <rect
                x={MARGIN.left + i * band}
                y={MARGIN.top - 16}
                width={band}
                height={plotH + 16}
                fill="transparent"
                onPointerEnter={() => {
                  setHover(i);
                }}
                onPointerLeave={() => {
                  setHover(null);
                }}
              />
            </Fragment>
          );
        })}
      </svg>

      {hover !== null && hovered && (
        <Tooltip
          x={barX(hover) + barW / 2}
          y={Math.min(barY(hovered.events.length), baseline - 40)}
          flip={barX(hover) > width / 2}
        >
          <p className="mb-1 font-mono text-parchment-500">
            {formatYear(hovered.year)} · {hovered.events.length}{" "}
            {hovered.events.length === 1 ? "event" : "events"}
          </p>
          {hovered.events.length > 0 && (
            <ul className="flex flex-col gap-0.5 text-parchment-100">
              {hovered.events.slice(0, MAX_LISTED).map((e) => (
                <li key={e.id}>{e.name}</li>
              ))}
              {hovered.events.length > MAX_LISTED && (
                <li className="text-parchment-500">
                  and {hovered.events.length - MAX_LISTED} more
                </li>
              )}
            </ul>
          )}
        </Tooltip>
      )}
    </div>
  );

  const table = (
    <DataTable
      columns={[{ label: "Year" }, { label: "Events", numeric: true }, { label: "Which" }]}
      rows={data.map((d) => ({
        key: String(d.year),
        cells: [
          formatYear(d.year),
          d.events.length,
          <span key="which" className="text-parchment-300">
            {d.events.map((e, i) => (
              <Fragment key={e.id}>
                {i > 0 && ", "}
                <Link to={`/entity/${e.id}`} className="hover:text-brass-300">
                  {e.name}
                </Link>
              </Fragment>
            ))}
          </span>,
        ],
      }))}
    />
  );

  return <ChartCard title={title} caption={caption} chart={chart} table={table} />;
}
