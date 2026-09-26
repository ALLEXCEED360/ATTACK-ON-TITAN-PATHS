import { useRememberRecent } from "../features/search/useRememberRecent";
import { Link, useParams } from "react-router";
import type { EntityKind } from "../api/client";
import { useEntities, useNeighborhood } from "../api/queries";
import { ErrorMessage, Loading } from "../components/QueryState";
import { EntityDetails } from "../features/entity/EntityDetails";
import { useExploreParams } from "../features/explore/params";
import { GraphPanel } from "../features/graph/GraphPanel";
import { TimeSlider } from "../features/timeline/TimeSlider";
import { TimelineList } from "../features/timeline/TimelineList";
import { KIND_LABELS } from "../lib/format";
import { PageHeader } from "../components/PageHeader";

const KIND_ORDER: EntityKind[] = ["character", "event", "titan", "faction", "location", "memory"];

function EntityIndex() {
  const { data, error, isPending } = useEntities();
  if (isPending) return <Loading />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader label="Explore" title="Choose where to start" kanji="探索" />
      {KIND_ORDER.map((kind) => {
        const items = data.items.filter((item) => item.kind === kind);
        if (items.length === 0) return null;
        return (
          <section key={kind} aria-label={KIND_LABELS[kind]} className="flex flex-col gap-2">
            <h2 className="label text-brass-500">{KIND_LABELS[kind]}s</h2>
            <ul className="flex flex-wrap gap-2">
              {items.map((item) => (
                <li key={item.id}>
                  <Link
                    to={`/explore/${item.id}`}
                    className="inline-block border border-charcoal-700 bg-charcoal-950 px-3 py-1.5 text-sm transition-colors hover:border-brass-500 hover:text-brass-200"
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
  useRememberRecent(id);
  const { at, search, setAt } = useExploreParams();
  // Events directly connected to the selection light up on the timeline.
  const { data: direct } = useNeighborhood(id, { depth: 1 });
  const related = new Set(
    direct?.nodes.filter((n) => n.kind === "event" && n.id !== id).map((n) => n.id),
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[16rem_1fr_22rem]">
      {id && <h1 className="sr-only">Explore</h1>}
      <aside
        aria-label="Timeline"
        className="order-3 pl-1.5 lg:order-1 lg:max-h-[calc(100dvh-9rem)] lg:overflow-y-auto"
      >
        <h2 className="label mb-3 text-brass-500">Timeline</h2>
        <TimelineList
          order="world"
          selected={id}
          related={related}
          at={at}
          search={search}
          compact
        />
      </aside>

      <section
        aria-label="Connections"
        // min-w-0: without it a wide graph or diagram stretches the grid column past the screen.
        className="order-1 flex min-w-0 flex-col gap-4 lg:order-2"
      >
        {id ? (
          <>
            <TimeSlider at={at} onChange={setAt} />
            <GraphPanel id={id} />
          </>
        ) : (
          <EntityIndex />
        )}
      </section>

      {id && (
        <aside aria-label="Details" className="frame order-2 self-start p-5 lg:order-3">
          <EntityDetails id={id} compact />
        </aside>
      )}
    </div>
  );
}
