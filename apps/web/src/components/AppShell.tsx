import { motion } from "motion/react";
import { Link, NavLink } from "react-router";
import { ChapterButton } from "../features/spoilers/ChapterButton";
import { ChapterGate } from "../features/spoilers/ChapterGate";
import { CommandPalette, PaletteTrigger } from "../features/search/CommandPalette";
import { RouteTransition } from "./RouteTransition";

const SECTIONS = [
  { to: "/explore", label: "Explore" },
  { to: "/timeline", label: "Timeline" },
  { to: "/analytics", label: "Analytics" },
];

function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `relative px-1 py-2 font-mono text-[0.72rem] tracking-[0.16em] uppercase transition-colors ${
          isActive ? "text-parchment-50" : "text-parchment-500 hover:text-parchment-100"
        }`
      }
    >
      {({ isActive }) => (
        <>
          {label}
          {isActive && (
            <motion.span
              layoutId="nav-underline"
              className="absolute inset-x-0 -bottom-px h-0.5 bg-brass-400"
              transition={{ type: "spring", stiffness: 500, damping: 40 }}
            />
          )}
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
        <header className="sticky top-0 z-40 border-b border-charcoal-800/80 bg-ink/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-8 gap-y-2 px-4 py-2.5">
            <Link to="/" className="group flex items-baseline gap-2" aria-label="PATHS home">
              <span className="display text-[1.7rem] tracking-[0.08em] text-parchment-50 transition-colors group-hover:text-brass-300">
                Paths
              </span>
              <span className="hidden font-mono text-[0.6rem] tracking-[0.2em] text-brass-500 uppercase lg:inline">
                Attack on Titan
              </span>
            </Link>
            <nav aria-label="Main" className="flex gap-5">
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
