import { Link } from "react-router";
import type { EntitySummary } from "../api/client";
import { useEntities } from "../api/queries";
import { Portrait } from "../art/Portrait";
import { portraitOf } from "../art/manifest";
import { PageHeader } from "../components/PageHeader";
import { ErrorMessage, Loading } from "../components/QueryState";
import { useCutoff } from "../stores/reader";

function Card({ item, cutoff }: { item: EntitySummary; cutoff: number }) {
  const art = portraitOf(cutoff, item.id);
  return (
    <li>
      <Link
        to={`/entity/${item.id}`}
        className="group flex flex-col gap-3 transition-transform duration-300 ease-[var(--ease-out-expo)] hover:-translate-y-1"
      >
        <div className="transition-[filter] duration-300 [filter:grayscale(0.35)] group-hover:[filter:none]">
          <Portrait art={art} kind={item.kind} name={item.name} size="sm" />
        </div>
        <span className="flex items-baseline gap-2 pl-1">
          <span
            aria-hidden="true"
            className="h-3 w-1 -skew-x-12 bg-brass-500 transition-colors group-hover:bg-blood-500"
          />
          <span className="gothic text-xl text-bone transition-colors group-hover:text-brass-200">
            {item.name}
          </span>
        </span>
      </Link>
    </li>
  );
}

/** Everyone the reader has met, as a character-select screen. Titans get their own row. */
export function RosterPage() {
  const cutoff = useCutoff();
  const { data, error, isPending } = useEntities();

  const groups = data
    ? [
        {
          title: "The people",
          kanji: "人",
          items: data.items.filter((i) => i.kind === "character"),
        },
        { title: "The Titans", kanji: "巨人", items: data.items.filter((i) => i.kind === "titan") },
      ]
    : [];

  return (
    <div className="flex flex-col gap-12">
      <PageHeader label="Roster" title="Everyone you've met" kanji="名簿">
        <p className="prose-story">
          Every person and Titan revealed up to chapter {cutoff}. Portraits appear as the story
          reaches them.
        </p>
      </PageHeader>

      {isPending ? (
        <Loading label="Calling the roll…" />
      ) : error ? (
        <ErrorMessage error={error} />
      ) : (
        groups.map(
          (group) =>
            group.items.length > 0 && (
              <section
                key={group.title}
                aria-labelledby={`roster-${group.kanji}`}
                className="flex flex-col gap-6"
              >
                <div className="flex items-end gap-4">
                  <span aria-hidden="true" className="kanji text-3xl text-brass-500">
                    {group.kanji}
                  </span>
                  <h2 id={`roster-${group.kanji}`} className="gothic text-4xl text-bone">
                    {group.title}
                  </h2>
                  <span className="font-mono text-xs text-parchment-500">
                    {String(group.items.length).padStart(2, "0")}
                  </span>
                  <div className="hairline mb-2 flex-1" />
                </div>
                <ul className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
                  {group.items.map((item) => (
                    <Card key={item.id} item={item} cutoff={cutoff} />
                  ))}
                </ul>
              </section>
            ),
        )
      )}
    </div>
  );
}
