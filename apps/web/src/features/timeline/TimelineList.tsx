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
    >
      {label}
    </button>
  );
  return (
    <div role="group" aria-label="Timeline order" className="seg">
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
        className={`absolute top-3.5 -left-[4.5px] size-2 rotate-45 ${
          selected
            ? "bg-brass-300 shadow-[0_0_10px_rgb(226_194_122/0.8)]"
            : related
              ? "bg-parchment-300"
              : "bg-charcoal-600"
        }`}
      />
      <Link
        ref={ref}
        to={`/explore/${item.id}${search}`}
        aria-current={selected ? "true" : undefined}
        className={`block border-l-2 px-2.5 py-1.5 transition-colors hover:bg-charcoal-900 ${
          selected
            ? "border-brass-400 bg-charcoal-900"
            : related
              ? "border-parchment-500/50 bg-charcoal-950"
              : "border-transparent"
        }`}
      >
        <span className="block font-mono text-xs text-parchment-500">
          {order === "story" ? `ch. ${String(item.revealedIn)} · ` : ""}
          {item.start ? formatFactDate(item.start) : "date not yet revealed"}
          {later && <span className="sr-only"> (after the chosen moment)</span>}
        </span>
        <span className={compact ? "text-sm" : "font-serif text-lg text-parchment-100"}>
          {item.name}
        </span>
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
    return <ol className="flex flex-col border-l border-charcoal-700">{data.items.map(link)}</ol>;
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
        // Years sit under the page's h1 on the Timeline page, under an h2 in the explorer.
        const Heading = compact ? "h3" : "h2";
        return (
          <section key={heading} aria-label={heading}>
            <Heading className={`display text-brass-300 ${compact ? "text-2xl" : "text-4xl"}`}>
              {heading}
            </Heading>
            <ol className="flex flex-col border-l border-charcoal-700">
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
