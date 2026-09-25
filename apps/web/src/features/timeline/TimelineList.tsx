import { useEffect, useRef } from "react";
import { Link } from "react-router";
import { useTimeline } from "../../api/queries";
import { ErrorMessage, Loading } from "../../components/QueryState";
import { formatFactDate, formatYear } from "../../lib/format";
import { type TimelineItem, isLater, parseAt, timelineRows } from "./time";

export type TimelineOrder = "world" | "story";

export function OrderToggle({
  order,
  onChange,
}: {
  order: TimelineOrder;
  onChange: (order: TimelineOrder) => void;
}) {
  const option = (value: TimelineOrder, label: string) => (
    <button
      type="button"
      aria-pressed={order === value}
      onClick={() => {
        onChange(value);
      }}
      className={`px-3 py-1 text-sm ${
        order === value ? "bg-charcoal-700 text-parchment-100" : "text-parchment-500"
      }`}
    >
      {label}
    </button>
  );
  return (
    <div
      role="group"
      aria-label="Timeline order"
      className="inline-flex rounded border border-charcoal-600"
    >
      {option("world", "When it happened")}
      {option("story", "When it's revealed")}
    </div>
  );
}

interface TimelineListProps {
  order: TimelineOrder;
  /** The selected entity, if it's an event. */
  selected?: string;
  /** Events connected to the selected entity: highlighted. */
  related?: ReadonlySet<string>;
  /** The chosen moment (`YYYY-MM`): later events are dimmed and a "now" marker is drawn. */
  at?: string;
  /** Query string to keep on links (the explorer's settings). */
  search?: string;
  compact?: boolean;
}

function EventLink({
  item,
  order,
  selected,
  related,
  later,
  search,
  compact,
}: {
  item: TimelineItem;
  order: TimelineOrder;
  selected: boolean;
  related: boolean;
  later: boolean;
  search: string;
  compact?: boolean;
}) {
  const ref = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (selected) ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selected]);

  return (
    <li className={`relative pl-4 transition-opacity ${later ? "opacity-40" : ""}`}>
      <span
        aria-hidden
        className={`absolute top-3 -left-[5px] size-2.5 rounded-full ${
          selected ? "bg-brass-300" : related ? "bg-parchment-300" : "bg-military-600"
        }`}
      />
      <Link
        ref={ref}
        to={`/explore/${item.id}${search}`}
        aria-current={selected ? "true" : undefined}
        className={`block rounded px-2 py-1.5 hover:bg-charcoal-800 ${
          selected ? "bg-charcoal-800 ring-1 ring-brass-500" : related ? "bg-charcoal-800/60" : ""
        }`}
      >
        <span className="block font-mono text-xs text-parchment-500">
          {order === "story" ? `ch. ${String(item.revealedIn)} · ` : ""}
          {item.start ? formatFactDate(item.start) : "date not yet revealed"}
          {later && <span className="sr-only"> (after the chosen moment)</span>}
        </span>
        <span className={compact ? "text-sm" : ""}>{item.name}</span>
      </Link>
    </li>
  );
}

/**
 * Events the reader knows about, in world order (grouped by year, empty stretches collapsed) or
 * story order (docs/model/spoilers.md §8).
 */
export function TimelineList({
  order,
  selected,
  related,
  at,
  search = "",
  compact,
}: TimelineListProps) {
  const { data, error, isPending } = useTimeline(order);
  if (isPending) return <Loading label="Loading timeline…" />;
  if (error) return <ErrorMessage error={error} />;

  const moment = parseAt(at);
  const link = (item: TimelineItem) => (
    <EventLink
      key={item.id}
      item={item}
      order={order}
      selected={item.id === selected}
      related={related?.has(item.id) ?? false}
      later={isLater(item, moment)}
      search={search}
      compact={compact}
    />
  );

  if (order === "story") {
    return <ol className="flex flex-col border-l border-charcoal-600">{data.items.map(link)}</ol>;
  }

  const rows = timelineRows(data.items);
  // The "now" marker goes before the first event that hasn't happened yet.
  const firstLater = data.items.find((item) => isLater(item, moment))?.id;

  return (
    <div className="flex flex-col gap-1">
      {rows.map((row, index) => {
        if (row.kind === "gap") {
          return (
            <p
              key={`gap-${String(index)}`}
              className="py-1 pl-4 font-mono text-xs text-parchment-500/70"
            >
              ⋮ {row.years} {row.years === 1 ? "year" : "years"} pass
            </p>
          );
        }
        const heading = row.kind === "year" ? formatYear(row.year) : "Undated";
        return (
          <section key={heading} aria-label={heading}>
            <h3 className="font-mono text-lg font-semibold text-brass-300">{heading}</h3>
            <ol className="flex flex-col border-l border-charcoal-600">
              {row.items.map((item) => (
                <FragmentWithNow key={item.id} now={item.id === firstLater}>
                  {link(item)}
                </FragmentWithNow>
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}

function FragmentWithNow({ now, children }: { now: boolean; children: React.ReactNode }) {
  return (
    <>
      {now && (
        <li aria-label="The chosen moment" className="relative -ml-px flex items-center gap-2 py-1">
          <span className="h-0.5 flex-1 bg-brass-500" />
          <span className="label text-brass-300">now</span>
        </li>
      )}
      {children}
    </>
  );
}
