import { Link, NavLink } from "react-router";
import { ChapterButton } from "../features/spoilers/ChapterButton";
import { ChapterGate } from "../features/spoilers/ChapterGate";
import { CommandPalette, PaletteTrigger } from "../features/search/CommandPalette";
import { RouteTransition } from "./RouteTransition";

const SECTIONS = [
  { to: "/explore", label: "Explore", kanji: "探索" },
  { to: "/roster", label: "Roster", kanji: "名簿" },
  { to: "/timeline", label: "Timeline", kanji: "年表" },
  { to: "/analytics", label: "Analytics", kanji: "分析" },
];

/** A menu slab: bone-white when it's the current section, like a game's pause menu. */
function NavItem({ to, label, kanji }: { to: string; label: string; kanji: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `slab-sm group relative flex items-baseline gap-2 px-4 py-1.5 transition-colors duration-200 ${
          isActive ? "bg-bone text-ink" : "text-parchment-300 hover:bg-charcoal-800 hover:text-bone"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span
            aria-hidden="true"
            className={`kanji text-[0.7rem] ${isActive ? "text-blood-500" : "text-brass-500"}`}
          >
            {kanji}
          </span>
          <span className="font-mono text-[0.7rem] font-bold tracking-[0.16em] uppercase">
            {label}
          </span>
        </>
      )}
    </NavLink>
  );
}

export function AppShell() {
  return (
    <ChapterGate>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[60] focus:bg-brass-500 focus:px-3 focus:py-1 focus:text-ink"
      >
        Skip to content
      </a>
      <div className="flex min-h-dvh flex-col">
        <header className="sticky top-0 z-40 border-b-2 border-bone/10 bg-ink/85 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2">
            <Link to="/" className="group flex items-center gap-2.5" aria-label="PATHS home">
              <span
                aria-hidden="true"
                className="kanji slab-sm bg-blood-500 px-2 py-0.5 text-sm text-bone transition-colors group-hover:bg-brass-500 group-hover:text-ink"
              >
                道
              </span>
              <span className="gothic text-[2rem] leading-none text-bone transition-colors group-hover:text-brass-200">
                Paths
              </span>
            </Link>
            <nav aria-label="Main" className="-mx-1 flex flex-wrap gap-1">
              {SECTIONS.map((s) => (
                <NavItem key={s.to} {...s} />
              ))}
            </nav>
            {/* On phones the search takes its own full-width row below the navigation. */}
            <div className="order-last flex w-full sm:order-none sm:ml-auto sm:w-auto sm:flex-1 sm:justify-end">
              <PaletteTrigger />
            </div>
            <div className="ml-auto sm:ml-0">
              <ChapterButton />
            </div>
          </div>
        </header>
        <CommandPalette />
        <main id="main" className="flex flex-1 flex-col">
          <RouteTransition />
        </main>
        <footer className="border-t border-charcoal-800 px-4 py-6">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 text-xs text-parchment-500">
            <p>
              Non-commercial fan project. <i>Attack on Titan</i> and its artwork belong to Hajime
              Isayama and Kodansha.
            </p>
            <Link
              to="/credits"
              className="font-mono tracking-[0.14em] uppercase hover:text-brass-300"
            >
              Credits
            </Link>
          </div>
        </footer>
      </div>
    </ChapterGate>
  );
}
