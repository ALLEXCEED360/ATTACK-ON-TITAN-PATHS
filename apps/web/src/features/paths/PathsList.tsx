import { Link } from "react-router";
import type { Paths } from "../../api/client";
import { formatYear } from "../../lib/format";

// The text version of PATHS mode (docs/features/paths-mode.md §7): the same content, in world
// order, readable by keyboard and screen reader.

type Range = { earliest: number; latest: number } | null;

/** "the " before a name, unless the name already starts with "The" (e.g. "The Coordinate"). */
export function theBefore(name: string): string {
  return /^the\s/i.test(name) ? "" : "the ";
}

export function formatRange(range: Range): string {
  if (!range) return "date unknown";
  const from = Math.floor(range.earliest / 10_000);
  const to = Math.floor(range.latest / 10_000);
  return from === to ? formatYear(from) : `between ${formatYear(from)} and ${formatYear(to)}`;
}

interface Row {
  key: string;
  when: number;
  label: string;
  text: React.ReactNode;
}

export function pathsRows(data: Paths, search: string): Row[] {
  const name = new Map([
    ...data.lanes.map((l) => [l.id, l.name] as const),
    ...data.events.map((e) => [e.id, e.name] as const),
    ...data.memories.map((m) => [m.id, m.name] as const),
  ]);
  const link = (id: string) => (
    <Link
      to={`/explore/${id}${search}`}
      className="text-parchment-100 underline decoration-charcoal-600 hover:decoration-brass-500"
    >
      {name.get(id) ?? id}
    </Link>
  );
  const rows: Row[] = [];

  for (const lane of data.lanes) {
    for (const segment of lane.segments) {
      rows.push({
        key: `${lane.id}-${segment.holder}`,
        when: segment.span.start?.earliest ?? -Infinity,
        label: segment.span.start ? formatRange(segment.span.start) : "Date unknown",
        text: (
          <>
            {link(segment.holder)} holds {theBefore(lane.name)}
            {link(lane.id)}
            {segment.span.end ? ` until ${formatRange(segment.span.end)}` : ""}.
          </>
        ),
      });
    }
  }
  for (const event of data.events) {
    rows.push({
      key: event.id,
      when: event.span.start?.earliest ?? Infinity,
      label: formatRange(event.span.start),
      text: (
        <>
          {link(event.id)}
          {event.lanes.length > 0 && (
            <>
              {" — "}
              {event.lanes.map((lane, i) => (
                <span key={lane}>
                  {i > 0 && ", "}
                  {link(lane)}
                </span>
              ))}
            </>
          )}
        </>
      ),
    });
  }
  for (const { from, to } of data.causal) {
    rows.push({
      key: `${from}->${to}`,
      when: data.events.find((e) => e.id === to)?.span.start?.earliest ?? Infinity,
      label: "Cause",
      text: (
        <>
          {link(from)} led to {link(to)}.
        </>
      ),
    });
  }
  for (const memory of data.memories) {
    for (const received of memory.received) {
      const backward =
        received.span.start && memory.date && received.span.start.earliest < memory.date.earliest;
      rows.push({
        key: `${memory.id}-${received.by}`,
        when: received.span.start?.earliest ?? Infinity,
        label: formatRange(received.span.start),
        text: (
          <>
            {link(received.by)} receives the memory {link(memory.id)}
            {memory.experiencedBy && <>, originally experienced by {link(memory.experiencedBy)}</>}
            {memory.date && <> in {formatRange(memory.date)}</>}
            {backward ? " — before it happened." : "."}
          </>
        ),
      });
    }
  }
  return rows.sort((a, b) => a.when - b.when || a.key.localeCompare(b.key));
}

export function PathsList({ data, search }: { data: Paths; search: string }) {
  const rows = pathsRows(data, search);
  if (rows.length === 0) {
    return (
      <p className="text-sm text-parchment-500">
        Nothing to trace across time yet at your chapter.
      </p>
    );
  }
  return (
    <ol className="flex flex-col gap-2">
      {rows.map((row) => (
        <li key={row.key} className="grid grid-cols-[9rem_1fr] gap-3 text-sm">
          <span className="font-mono text-xs text-parchment-500">{row.label}</span>
          <span className="text-parchment-300">{row.text}</span>
        </li>
      ))}
    </ol>
  );
}
