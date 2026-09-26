import { Link, useParams } from "react-router";
import { ArtImage } from "../art/ArtImage";
import { ARTWORK, artworkAt } from "../art/manifest";
import { EntityDetails } from "../features/entity/EntityDetails";
import { ConnectionsList } from "../features/graph/ConnectionsList";
import { useRememberRecent } from "../features/search/useRememberRecent";
import { useCutoff } from "../stores/reader";

const MAP = ARTWORK.find((art) => art.id === "walls-map");

export function EntityPage() {
  const { id = "" } = useParams();
  const cutoff = useCutoff();
  useRememberRecent(id);
  // Only art the reader has reached, and only art that shows this entity.
  const art = artworkAt(cutoff, id)[0];

  return (
    <div className="flex flex-col">
      <section className="relative isolate overflow-hidden border-b border-charcoal-800">
        {art ? (
          <ArtImage
            key={art.id}
            art={art}
            eager
            fade="both"
            className="absolute inset-y-0 right-0 -z-10 w-full opacity-60 md:w-3/5 md:opacity-90"
          />
        ) : (
          MAP && (
            <img
              src={MAP.src}
              alt=""
              aria-hidden="true"
              className="absolute inset-y-0 right-0 -z-10 h-full w-3/5 object-cover opacity-[0.12] [filter:sepia(0.6)] [mask-image:linear-gradient(to_right,transparent,#000_60%)]"
            />
          )
        )}
        <div className="mx-auto flex min-h-[26rem] w-full max-w-7xl flex-col justify-end px-4 pt-20 pb-12">
          <EntityDetails key={id} id={id} />
        </div>
      </section>

      <section
        aria-labelledby="connections"
        className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-14"
      >
        <div className="flex items-end gap-6">
          <h2 id="connections" className="display text-4xl text-parchment-50">
            Connections
          </h2>
          <div className="hairline mb-2 flex-1" />
          <Link
            to={`/explore/${id}`}
            className="font-mono text-xs tracking-[0.16em] whitespace-nowrap text-brass-300 uppercase hover:text-brass-200"
          >
            Explore the graph →
          </Link>
        </div>
        <ConnectionsList id={id} />
      </section>
    </div>
  );
}
