import { type ReactNode, useId, useState } from "react";

/**
 * A titled panel holding one chart, with a switch to the same data as a table — every chart has a
 * table view, so nothing is only readable by colour or by hovering.
 */
export function ChartCard({
  title,
  caption,
  chart,
  table,
  className = "",
}: {
  title: string;
  caption?: ReactNode;
  chart: ReactNode;
  table?: ReactNode;
  className?: string;
}) {
  const [asTable, setAsTable] = useState(false);
  const heading = useId();

  return (
    <section
      aria-labelledby={heading}
      className={`flex min-w-0 flex-col gap-4 rounded-lg border border-charcoal-700 bg-charcoal-900 p-5 ${className}`}
    >
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 id={heading} className="text-lg font-semibold">
            {title}
          </h2>
          {caption && <p className="text-sm text-parchment-500">{caption}</p>}
        </div>
        {table && (
          <button
            type="button"
            aria-pressed={asTable}
            onClick={() => {
              setAsTable((v) => !v);
            }}
            className="shrink-0 rounded border border-charcoal-600 px-2 py-1 font-mono text-[0.7rem] tracking-[0.12em] text-parchment-300 uppercase hover:border-parchment-500 hover:text-parchment-100"
          >
            {asTable ? "Chart" : "Table"}
          </button>
        )}
      </header>
      {asTable ? table : chart}
    </section>
  );
}

/** A plain data table in the charts' style. */
export function DataTable({
  columns,
  rows,
}: {
  columns: { label: string; numeric?: boolean }[];
  rows: { key: string; cells: ReactNode[] }[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-charcoal-700 text-left">
            {columns.map((c) => (
              <th
                key={c.label}
                scope="col"
                className={`label py-2 pr-4 font-normal ${c.numeric ? "text-right" : ""}`}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b border-charcoal-800 align-top">
              {row.cells.map((cell, i) => (
                <td
                  key={columns[i]?.label ?? i}
                  className={`py-2 pr-4 ${columns[i]?.numeric ? "text-right tabular-nums" : ""}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** A hover card beside the pointer; flips to the left in the right half of the chart. */
export function Tooltip({
  x,
  y,
  flip,
  children,
}: {
  x: number;
  y: number;
  flip: boolean;
  children: ReactNode;
}) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute z-10 w-max max-w-64 rounded border border-charcoal-600 bg-charcoal-950/95 px-3 py-2 text-xs shadow-lg shadow-black/40"
      style={{
        left: x,
        top: y,
        transform: flip ? "translateX(calc(-100% - 12px))" : "translateX(12px)",
      }}
    >
      {children}
    </div>
  );
}
