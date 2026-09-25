import { Link } from "react-router";
import { useTimeline } from "../../api/queries";
import { ErrorMessage, Loading } from "../../components/QueryState";
import { formatFactDate } from "../../lib/format";

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

/**
 * Events the reader knows about, in world order or story order (docs/model/spoilers.md §8).
 * A proper zoomable timeline arrives in Phase 6.
 */
export function TimelineList({
  order,
  selected,
  compact,
}: {
  order: TimelineOrder;
  selected?: string;
  compact?: boolean;
}) {
  const { data, error, isPending } = useTimeline(order);
  if (isPending) return <Loading label="Loading timeline…" />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <ol className="flex flex-col border-l border-charcoal-600">
      {data.items.map((item) => (
        <li key={item.id} className="relative pl-4">
          <span
            aria-hidden
            className={`absolute top-3 -left-[5px] size-2.5 rounded-full ${
              item.id === selected ? "bg-brass-300" : "bg-military-600"
            }`}
          />
          <Link
            to={`/explore/${item.id}`}
            aria-current={item.id === selected ? "true" : undefined}
            className={`block rounded px-2 py-1.5 hover:bg-charcoal-800 ${
              item.id === selected ? "bg-charcoal-800" : ""
            }`}
          >
            <span className="block font-mono text-xs text-parchment-500">
              {order === "story" ? `ch. ${String(item.revealedIn)} · ` : ""}
              {item.start ? formatFactDate(item.start) : "date unknown"}
            </span>
            <span className={compact ? "text-sm" : ""}>{item.name}</span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
