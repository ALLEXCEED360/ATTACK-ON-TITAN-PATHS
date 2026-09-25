import { Link, useParams } from "react-router";
import type { EntityKind } from "../api/client";
import { useEntities } from "../api/queries";
import { ErrorMessage, Loading } from "../components/QueryState";
import { EntityDetails } from "../features/entity/EntityDetails";
import { GraphPanel } from "../features/graph/GraphPanel";
import { TimelineList } from "../features/timeline/TimelineList";
import { KIND_LABELS } from "../lib/format";

const KIND_ORDER: EntityKind[] = ["character", "event", "titan", "faction", "location", "memory"];

function EntityIndex() {
  const { data, error, isPending } = useEntities();
  if (isPending) return <Loading />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div className="flex flex-col gap-6">
      <p className="text-parchment-300">Choose where to start.</p>
      {KIND_ORDER.map((kind) => {
        const items = data.items.filter((item) => item.kind === kind);
        if (items.length === 0) return null;
        return (
          <section key={kind} aria-label={KIND_LABELS[kind]} className="flex flex-col gap-2">
            <h2 className="label">{KIND_LABELS[kind]}s</h2>
            <ul className="flex flex-wrap gap-2">
              {items.map((item) => (
                <li key={item.id}>
                  <Link
                    to={`/explore/${item.id}`}
                    className="inline-block rounded border border-charcoal-600 px-2.5 py-1 text-sm hover:border-brass-500"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

/**
 * The three-pane explorer: timeline | graph | details.
 * The selection and moment live in the URL, so any view can be shared.
 */
export function ExplorePage() {
  const { id } = useParams();

  return (
    <div className="grid gap-6 lg:grid-cols-[16rem_1fr_22rem]">
      <aside
        aria-label="Timeline"
        className="order-3 lg:order-1 lg:max-h-[calc(100dvh-9rem)] lg:overflow-y-auto"
      >
        <h2 className="label mb-3">Timeline</h2>
        <TimelineList order="world" selected={id} compact />
      </aside>

      <section aria-label="Connections" className="order-1 flex flex-col gap-4 lg:order-2">
        {id ? (
          <>
            <h2 className="label">Connections</h2>
            <GraphPanel id={id} />
          </>
        ) : (
          <EntityIndex />
        )}
      </section>

      {id && (
        <aside
          aria-label="Details"
          className="order-2 rounded-lg border border-charcoal-700 bg-charcoal-900 p-5 lg:order-3"
        >
          <EntityDetails id={id} compact />
        </aside>
      )}
    </div>
  );
}
