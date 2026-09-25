import { Link } from "react-router";
import { useEntities } from "../api/queries";
import { useCutoff } from "../stores/reader";

export function HomePage() {
  const cutoff = useCutoff();
  const { data } = useEntities();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10 py-10">
      <section className="flex flex-col gap-4">
        <p className="label">Attack on Titan: PATHS</p>
        <h1 className="text-4xl font-semibold sm:text-5xl">The story, connected across time.</h1>
        <p className="text-lg text-parchment-300">
          Explore the manga&apos;s characters, events, places and Titans — who is connected to whom,
          what led to what, and when. Everything is filtered to what you&apos;ve read: you&apos;re
          at chapter <span className="font-mono text-brass-300">{cutoff}</span>.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/explore"
            className="rounded bg-brass-500 px-4 py-2 font-semibold text-charcoal-950 hover:bg-brass-300"
          >
            Start exploring
          </Link>
          <Link
            to="/timeline"
            className="rounded border border-charcoal-600 px-4 py-2 text-parchment-300 hover:border-parchment-500"
          >
            Browse the timeline
          </Link>
        </div>
      </section>

      {data && (
        <p className="text-sm text-parchment-500">
          {data.items.length} people, places, events and Titans known at chapter {cutoff}.
        </p>
      )}
    </div>
  );
}
