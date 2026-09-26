import { useState } from "react";
import { Link, useParams } from "react-router";
import { useEntity } from "../api/queries";
import { Portrait } from "../art/Portrait";
import { ARTWORK, type Artwork, artworkAt, portraitsOf } from "../art/manifest";
import { EntityDetails } from "../features/entity/EntityDetails";
import { ConnectionsList } from "../features/graph/ConnectionsList";
import { useRememberRecent } from "../features/search/useRememberRecent";
import { useCutoff } from "../stores/reader";

const MAP = ARTWORK.find((art) => art.id === "walls-map");

const KIND_KANJI: Record<string, string> = {
  character: "人物",
  titan: "巨人",
  event: "戦記",
  location: "地誌",
  faction: "兵団",
  memory: "記憶",
};

/** The portrait card, with small thumbnails to switch between likenesses (e.g. a Titan form). */
function PortraitColumn({ kind, name, art }: { kind: string; name: string; art: Artwork[] }) {
  const [chosen, setChosen] = useState(0);
  const current = art[chosen] ?? art[0];

  return (
    <div className="mx-auto flex w-full max-w-[22rem] flex-col gap-5">
      <Portrait art={current} kind={kind} name={name} eager />
      {art.length > 1 && (
        <div role="group" aria-label="Likenesses" className="flex gap-3 pl-2">
          {art.map((a, i) => (
            <button
              key={a.id}
              type="button"
              aria-pressed={i === chosen}
              aria-label={a.alt}
              onClick={() => {
                setChosen(i);
              }}
              className={`slab-sm size-16 overflow-hidden border-2 transition-colors ${
                i === chosen ? "border-bone" : "border-charcoal-700 opacity-60 hover:opacity-100"
              }`}
            >
              <img src={a.src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** One entity as a game-style dossier: portrait card, name and story, then its connections. */
export function EntityPage() {
  const { id = "" } = useParams();
  const cutoff = useCutoff();
  useRememberRecent(id);
  const { data } = useEntity(id);

  // Only art the reader has reached, and only art that shows this entity.
  const portraits = portraitsOf(cutoff, id);
  const scenes = artworkAt(cutoff, id).filter((art) => art.kind === "illustration");
  const card = portraits.length > 0 ? portraits : scenes;
  const showCard = data && (card.length > 0 || data.kind === "character" || data.kind === "titan");
  const backdrop = scenes[0];

  return (
    <div className="flex flex-col">
      <section className="relative isolate overflow-hidden border-b border-charcoal-800">
        <img
          src={(backdrop ?? MAP)?.src}
          alt=""
          aria-hidden="true"
          className={`absolute inset-0 -z-20 h-full w-full object-cover ${
            backdrop ? "opacity-20 blur-[2px]" : "opacity-[0.1] [filter:sepia(0.6)]"
          }`}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[linear-gradient(100deg,var(--color-ink)_30%,transparent_80%),linear-gradient(to_top,var(--color-ink),transparent_40%)]"
        />
        {data && (
          <span
            aria-hidden="true"
            className="kanji-watermark absolute top-1/2 right-[-2rem] -z-10 -translate-y-1/2 text-[12rem] sm:text-[20rem]"
          >
            {KIND_KANJI[data.kind] ?? "記録"}
          </span>
        )}
        <div
          className={`mx-auto grid w-full max-w-7xl items-center gap-12 px-4 pt-14 pb-14 ${
            showCard ? "lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]" : ""
          }`}
        >
          {showCard && <PortraitColumn key={id} kind={data.kind} name={data.name} art={card} />}
          <EntityDetails key={id} id={id} />
        </div>
      </section>

      <section
        aria-labelledby="connections"
        className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-14"
      >
        <div className="flex items-end gap-4">
          <span aria-hidden="true" className="kanji text-2xl text-brass-500">
            関係
          </span>
          <h2 id="connections" className="gothic text-4xl text-bone">
            Connections
          </h2>
          <div className="hairline mb-2 flex-1" />
          <Link
            to={`/explore/${id}`}
            className="slab-sm bg-charcoal-800 px-4 py-1.5 font-mono text-[0.7rem] font-bold tracking-[0.16em] whitespace-nowrap text-brass-300 uppercase transition-colors hover:bg-bone hover:text-ink"
          >
            Explore the graph →
          </Link>
        </div>
        <ConnectionsList id={id} />
      </section>
    </div>
  );
}
