import type { CSSProperties } from "react";
import { Link } from "react-router";
import { useEntities } from "../api/queries";
import { ArtImage } from "../art/ArtImage";
import { ARTWORK, heroArt } from "../art/manifest";
import { useCutoff } from "../stores/reader";
import { useUi } from "../stores/ui";

const MAP = ARTWORK.find((art) => art.id === "walls-map");

const WAYS = [
  {
    n: "01",
    to: "/explore",
    title: "Explore",
    text: "The web of who knew whom, who fought where, and who holds which power.",
  },
  {
    n: "02",
    to: "/explore/character_eren_yeager?mode=paths",
    title: "PATHS",
    text: "Follow one life across the years — lineages, memories and the chains of cause and effect.",
  },
  {
    n: "03",
    to: "/timeline",
    title: "Timeline",
    text: "Everything in the order it happened, or in the order the manga reveals it.",
  },
  {
    n: "04",
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
          <p className="label animate-rise text-brass-400" style={rise(0)}>
            Attack on Titan · Read to chapter {cutoff}
          </p>
          <h1 className="display text-[clamp(3.6rem,10.5vw,9.5rem)] text-parchment-50">
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
            <Link to="/explore" className="btn btn-primary notch">
              Enter the graph <span aria-hidden="true">→</span>
            </Link>
            <Link to="/timeline" className="btn btn-ghost">
              Walk the timeline
            </Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="ways" className="mx-auto w-full max-w-7xl px-4 py-20">
        <div className="mb-10 flex items-end justify-between gap-6">
          <h2 id="ways" className="display text-4xl text-parchment-50 sm:text-5xl">
            Four ways in
          </h2>
          <div className="hairline mb-3 hidden flex-1 sm:block" />
        </div>
        <ul className="grid gap-px bg-charcoal-800 sm:grid-cols-2 lg:grid-cols-4">
          {WAYS.map((way) => (
            <li key={way.n} className="bg-ink">
              <Link
                to={way.to}
                className="group relative flex h-full min-h-60 flex-col gap-4 p-6 transition-colors hover:bg-charcoal-950"
              >
                <span className="font-mono text-xs tracking-[0.2em] text-brass-500">{way.n}</span>
                <span className="display text-4xl text-parchment-50 transition-colors group-hover:text-brass-300">
                  {way.title}
                </span>
                <span className="text-sm leading-relaxed text-parchment-500">{way.text}</span>
                <span
                  aria-hidden="true"
                  className="mt-auto font-mono text-xs tracking-[0.2em] text-parchment-500 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-brass-300"
                >
                  ENTER →
                </span>
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-brass-400 transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:scale-x-100"
                />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-label={`What's known at chapter ${String(cutoff)}`}
        className="border-y border-charcoal-800 bg-charcoal-950/60"
      >
        <dl className="mx-auto grid max-w-7xl grid-cols-2 gap-px px-4 sm:grid-cols-5">
          {COUNTS.map(({ kind, label }) => (
            <div key={kind} className="flex flex-col-reverse gap-1 py-8 sm:px-4">
              <dt className="label">{label}</dt>
              <dd className="display text-6xl text-parchment-50 tabular-nums">
                {data ? data.items.filter((item) => item.kind === kind).length : "—"}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mx-auto flex w-full max-w-7xl flex-col items-start gap-5 px-4 py-24">
        <p className="label text-brass-400">The spoiler shield</p>
        <p className="display max-w-4xl text-5xl text-parchment-50 sm:text-7xl">
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
