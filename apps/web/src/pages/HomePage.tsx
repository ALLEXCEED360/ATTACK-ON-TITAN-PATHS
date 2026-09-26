import type { CSSProperties } from "react";
import { Link } from "react-router";
import { useEntities } from "../api/queries";
import { ArtImage } from "../art/ArtImage";
import { ARTWORK, artworkAt, heroArt, portraitOf } from "../art/manifest";
import { useCutoff } from "../stores/reader";
import { useUi } from "../stores/ui";

const MAP = ARTWORK.find((art) => art.id === "walls-map");

// The main cast, in the order the parade shows them (only those the reader has met, with art).
const CAST = [
  "character_eren_yeager",
  "character_mikasa_ackerman",
  "character_armin_arlert",
  "character_levi",
  "character_erwin_smith",
  "character_hange_zoe",
  "character_jean_kirstein",
  "character_sasha_blouse",
  "character_reiner_braun",
  "character_annie_leonhart",
  "character_bertholdt_hoover",
  "character_ymir_104th",
];

const WAYS = [
  {
    n: "01",
    kanji: "探索",
    to: "/explore",
    title: "Explore",
    text: "The web of who knew whom, who fought where, and who holds which power.",
  },
  {
    n: "02",
    kanji: "道",
    to: "/explore/character_eren_yeager?mode=paths",
    title: "Paths",
    text: "Follow one life across the years — lineages, memories and the chains of cause and effect.",
  },
  {
    n: "03",
    kanji: "年表",
    to: "/timeline",
    title: "Timeline",
    text: "Everything in the order it happened, or in the order the manga reveals it.",
  },
  {
    n: "04",
    kanji: "分析",
    to: "/analytics",
    title: "Analytics",
    text: "The story in numbers: connections over time, factions side by side.",
  },
];

const COUNTS = [
  { kind: "character", label: "People" },
  { kind: "event", label: "Events" },
  { kind: "location", label: "Places" },
  { kind: "faction", label: "Factions" },
  { kind: "titan", label: "Titans" },
];

const rise = (delay: number): CSSProperties => ({ animationDelay: `${String(delay)}ms` });

export function HomePage() {
  const cutoff = useCutoff();
  const { data } = useEntities();
  const setChapterOpen = useUi((state) => state.setChapterOpen);
  const art = heroArt(cutoff);
  const names = new Map(data?.items.map((item) => [item.id, item.name]));
  // Only people the reader has met (the entity list is already spoiler-filtered) with art.
  const cast = CAST.flatMap((id) => {
    const name = names.get(id);
    const portrait = portraitOf(cutoff, id);
    return name && portrait ? [{ id, name, art: portrait }] : [];
  });
  const covers = artworkAt(cutoff)
    .filter((a) => a.kind === "cover")
    .sort((a, b) => a.id.localeCompare(b.id));

  return (
    <div className="flex flex-col">
      <section className="relative isolate flex min-h-[calc(100dvh-3.5rem)] items-end overflow-hidden">
        {art ? (
          <ArtImage
            key={art.id}
            art={art}
            eager
            fade="both"
            className="absolute inset-y-0 right-0 -z-10 w-full animate-[drift_2.4s_var(--ease-out-expo)_both] opacity-40 md:w-[70%] md:opacity-100"
          />
        ) : (
          MAP && (
            <img
              src={MAP.src}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 -z-10 h-full w-full object-cover opacity-20 [filter:sepia(0.6)]"
            />
          )
        )}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-ink to-transparent"
        />

        <div className="mx-auto flex w-full max-w-7xl flex-col gap-7 px-4 pt-28 pb-20">
          <span className="ribbon animate-rise self-start" style={rise(0)}>
            Attack on Titan · Read to chapter {cutoff}
          </span>
          <h1 className="gothic text-[clamp(3.6rem,10vw,9rem)] text-bone">
            <span className="block animate-rise" style={rise(80)}>
              The story,
            </span>
            <span className="block animate-rise text-brass-300" style={rise(160)}>
              connected
            </span>
            <span className="block animate-rise" style={rise(240)}>
              across time.
            </span>
          </h1>
          <p className="prose-story max-w-xl animate-rise text-lg" style={rise(360)}>
            Explore the manga&apos;s characters, events, places and Titans — who is connected to
            whom, what led to what, and when. Nothing here goes past chapter {cutoff}.
          </p>
          <div className="flex animate-rise flex-wrap gap-3" style={rise(460)}>
            <Link to="/explore" className="btn btn-primary slab-sm">
              Enter the graph <span aria-hidden="true">→</span>
            </Link>
            <Link to="/roster" className="btn btn-ghost">
              Meet the cast
            </Link>
          </div>
        </div>
      </section>

      {cast.length > 0 && (
        <section
          aria-labelledby="cast"
          className="mx-auto w-full max-w-7xl overflow-x-clip px-4 pt-16"
        >
          <div className="mb-8 flex items-end gap-4">
            <span aria-hidden="true" className="kanji text-3xl text-brass-500">
              登場人物
            </span>
            <h2 id="cast" className="gothic text-5xl text-bone">
              The cast
            </h2>
            <div className="hairline mb-3 flex-1" />
            <Link
              to="/roster"
              className="font-mono text-[0.7rem] tracking-[0.16em] text-brass-300 uppercase hover:text-brass-200"
            >
              Full roster →
            </Link>
          </div>
          {/* A parade of slanted portrait strips; the one under the pointer opens up. */}
          <ul className="flex h-[22rem] gap-1.5 sm:h-[26rem]">
            {cast.map(({ id, name, art }) => (
              <li
                key={id}
                className="group min-w-0 flex-1 transition-[flex-grow] max-sm:[&:nth-child(n+7)]:hidden duration-500 ease-[var(--ease-out-expo)] focus-within:flex-[3] hover:flex-[3]"
              >
                <Link
                  to={`/entity/${id}`}
                  aria-label={name}
                  className="relative block h-full -skew-x-6 overflow-hidden border-y-2 border-bone/80 bg-charcoal-900"
                >
                  <img
                    src={art.src}
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 h-full w-full scale-125 skew-x-6 object-cover [filter:grayscale(0.6)_contrast(1.05)] transition-[filter] duration-500 group-hover:[filter:none]"
                    style={{ objectPosition: "50% 20%" }}
                  />
                  <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink to-transparent" />
                  <span
                    aria-hidden="true"
                    className="gothic absolute bottom-3 left-3 skew-x-6 text-lg whitespace-nowrap text-bone opacity-0 transition-opacity duration-300 group-focus-within:opacity-100 group-hover:opacity-100 sm:text-2xl"
                  >
                    {name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="ways" className="mx-auto w-full max-w-7xl px-4 py-20">
        <div className="mb-10 flex items-end gap-4">
          <span aria-hidden="true" className="kanji text-3xl text-brass-500">
            入口
          </span>
          <h2 id="ways" className="gothic text-5xl text-bone">
            Four ways in
          </h2>
          <div className="hairline mb-3 hidden flex-1 sm:block" />
        </div>
        <ul className="flex flex-col gap-2">
          {WAYS.map((way) => (
            <li key={way.n}>
              <Link
                to={way.to}
                className="slab group relative flex flex-wrap items-center gap-x-6 gap-y-1 overflow-hidden bg-charcoal-950 py-4 pr-10 pl-8 transition-colors duration-300 hover:bg-bone"
              >
                <span className="display w-12 text-3xl text-brass-500 group-hover:text-blood-500">
                  {way.n}
                </span>
                <span
                  aria-hidden="true"
                  className="kanji w-14 text-2xl text-parchment-500 group-hover:text-ink"
                >
                  {way.kanji}
                </span>
                <span className="gothic text-4xl text-bone group-hover:text-ink sm:w-48">
                  {way.title}
                </span>
                <span className="min-w-0 basis-full text-sm text-parchment-500 group-hover:text-charcoal-700 sm:flex-1 sm:basis-auto">
                  {way.text}
                </span>
                <span
                  aria-hidden="true"
                  className="hidden font-mono text-xs font-bold tracking-[0.2em] text-parchment-500 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-blood-500 sm:inline"
                >
                  ENTER →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {covers.length > 0 && (
        <section aria-labelledby="shelf" className="mx-auto w-full max-w-7xl px-4 pb-20">
          <div className="mb-8 flex items-end gap-4">
            <span aria-hidden="true" className="kanji text-3xl text-brass-500">
              単行本
            </span>
            <h2 id="shelf" className="gothic text-5xl text-bone">
              Your shelf
            </h2>
            <div className="hairline mb-3 flex-1" />
            <span className="font-mono text-xs text-parchment-500">
              {covers.length} {covers.length === 1 ? "volume" : "volumes"} finished
            </span>
          </div>
          <ul
            // Scrolls sideways, so it must be reachable by keyboard.
            tabIndex={0}
            aria-label="Volumes you have finished"
            className="flex gap-4 overflow-x-auto pt-2 pb-4"
          >
            {covers.map((cover) => (
              <li key={cover.id} className="shrink-0">
                <img
                  src={cover.src}
                  alt={cover.alt}
                  width={cover.width}
                  height={cover.height}
                  loading="lazy"
                  className="h-64 w-auto border border-charcoal-700 shadow-[6px_6px_0_var(--color-cloak-700)] transition-transform duration-300 hover:-translate-y-2 hover:-rotate-1"
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section
        aria-label={`What's known at chapter ${String(cutoff)}`}
        className="border-y border-charcoal-800 bg-charcoal-950/60"
      >
        <dl className="mx-auto grid max-w-7xl grid-cols-2 gap-px px-4 sm:grid-cols-5">
          {COUNTS.map(({ kind, label }) => (
            <div key={kind} className="flex flex-col-reverse gap-1 py-8 sm:px-4">
              <dt className="label">{label}</dt>
              <dd className="display text-6xl text-bone tabular-nums">
                {data ? data.items.filter((item) => item.kind === kind).length : "—"}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mx-auto flex w-full max-w-7xl flex-col items-start gap-5 px-4 py-24">
        <span className="ribbon">The spoiler shield</span>
        <p className="gothic max-w-4xl text-5xl text-bone sm:text-7xl">
          Nothing past chapter <span className="text-brass-300">{cutoff}</span>. Not a name, not a
          date, not a death.
        </p>
        <p className="prose-story max-w-2xl">
          Every fact carries the chapter that reveals it — names, relationships, even when someone
          dies. PATHS hides everything beyond where you are, including what its absence would give
          away.
        </p>
        <button
          type="button"
          onClick={() => {
            setChapterOpen(true);
          }}
          className="btn btn-ghost"
        >
          Change chapter
        </button>
      </section>
    </div>
  );
}
