import { ArtImage } from "../art/ArtImage";
import { ARTWORK, artworkAt } from "../art/manifest";
import { useCutoff } from "../stores/reader";
import { PageHeader } from "../components/PageHeader";

const GROUPS = [
  {
    kind: "illustration",
    title: "Illustrations",
    kanji: "画",
    grid: "sm:grid-cols-2 lg:grid-cols-3",
    aspect: "aspect-[4/3]",
  },
  {
    kind: "portrait",
    title: "Portraits",
    kanji: "肖像",
    grid: "grid-cols-2 sm:grid-cols-4 lg:grid-cols-6",
    aspect: "aspect-square",
  },
  {
    kind: "cover",
    title: "Volume covers",
    kanji: "表紙",
    grid: "grid-cols-2 sm:grid-cols-4 lg:grid-cols-6",
    aspect: "aspect-[2/3]",
  },
] as const;

const FONTS = [
  { name: "Big Shoulders Display", by: "Patric King", license: "SIL Open Font License" },
  { name: "Source Serif 4", by: "Frank Grießhammer / Adobe", license: "SIL Open Font License" },
  { name: "Inter", by: "Rasmus Andersson", license: "SIL Open Font License" },
  { name: "JetBrains Mono", by: "JetBrains", license: "SIL Open Font License" },
  { name: "Grenze Gotisch", by: "Omnibus-Type", license: "SIL Open Font License" },
  { name: "Dela Gothic One", by: "artakana", license: "SIL Open Font License" },
  { name: "Shippori Mincho B1", by: "FONTDASU", license: "SIL Open Font License" },
];

export function CreditsPage() {
  const cutoff = useCutoff();
  const visible = artworkAt(cutoff);
  const hidden = ARTWORK.length - visible.length;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-14">
      <PageHeader label="Credits" title="Who made this possible" kanji="謝辞">
        <p className="prose-story max-w-2xl">
          <i>Attack on Titan</i> is the work of Hajime Isayama, published by Kodansha. PATHS is a
          non-commercial fan project and isn&apos;t affiliated with either. Every fact in it is
          written in our own words and cites the chapter it comes from.
        </p>
      </PageHeader>

      <section aria-labelledby="artwork" className="flex flex-col gap-6">
        <div className="flex items-end gap-6">
          <h2 id="artwork" className="gothic text-4xl text-bone">
            Artwork
          </h2>
          <div className="hairline mb-2 flex-1" />
        </div>
        <p className="max-w-2xl text-sm text-parchment-500">
          Artwork is shown for decoration and credited here. It isn&apos;t covered by this
          project&apos;s licenses, and any piece will be removed at a rights holder&apos;s request.
          Like everything else, art only appears once you&apos;ve reached the chapter it belongs to
          {hidden > 0 && (
            <>
              {" "}
              — {hidden} {hidden === 1 ? "piece is" : "pieces are"} hidden until you read further
            </>
          )}
          .
        </p>
        {GROUPS.map((group) => {
          const items = visible.filter((art) => art.kind === group.kind);
          if (items.length === 0) return null;
          return (
            <div key={group.kind} className="flex flex-col gap-4">
              <h3 className="flex items-baseline gap-3">
                <span aria-hidden="true" className="kanji text-lg text-brass-500">
                  {group.kanji}
                </span>
                <span className="gothic text-2xl text-bone">{group.title}</span>
                <span className="font-mono text-xs text-parchment-500">{items.length}</span>
              </h3>
              <ul className={`grid gap-5 ${group.grid}`}>
                {items.map((art) => (
                  <li key={art.id} className="flex flex-col gap-2">
                    <ArtImage
                      art={art}
                      credit={false}
                      className={`${group.aspect} border border-charcoal-800`}
                    />
                    <div className="flex flex-col gap-0.5 text-xs">
                      <p className="text-parchment-100">
                        {art.credit.url ? (
                          <a
                            href={art.credit.url}
                            className="hover:text-brass-300"
                            rel="noreferrer"
                          >
                            {art.credit.artist}
                          </a>
                        ) : (
                          art.credit.artist
                        )}
                        {art.credit.kind === "fan" && (
                          <span className="ml-2 font-mono text-parchment-500">fan art</span>
                        )}
                      </p>
                      <p className="text-parchment-500">{art.credit.source}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>

      <section aria-labelledby="fonts" className="flex flex-col gap-6">
        <div className="flex items-end gap-6">
          <h2 id="fonts" className="gothic text-4xl text-bone">
            Type
          </h2>
          <div className="hairline mb-2 flex-1" />
        </div>
        <ul className="grid gap-4 sm:grid-cols-2">
          {FONTS.map((font) => (
            <li key={font.name} className="border-l border-brass-700 pl-4 text-sm">
              <p className="text-parchment-100">{font.name}</p>
              <p className="text-parchment-500">
                {font.by} · {font.license}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
