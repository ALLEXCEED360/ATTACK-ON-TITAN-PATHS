import { Link, NavLink, Outlet } from "react-router";
import { ChapterButton } from "../features/spoilers/ChapterButton";
import { ChapterGate } from "../features/spoilers/ChapterGate";
import { SearchBox } from "../features/search/SearchBox";

const navLink = ({ isActive }: { isActive: boolean }) =>
  `rounded px-2 py-1 text-sm ${isActive ? "text-brass-300" : "text-parchment-300 hover:text-parchment-100"}`;

export function AppShell() {
  return (
    <ChapterGate>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-brass-500 focus:px-3 focus:py-1 focus:text-charcoal-950"
      >
        Skip to content
      </a>
      <div className="flex min-h-dvh flex-col">
        <header className="sticky top-0 z-10 border-b border-charcoal-700 bg-charcoal-950/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
            <Link
              to="/"
              className="font-mono text-sm font-semibold tracking-[0.3em] text-brass-300"
            >
              PATHS
            </Link>
            <nav aria-label="Main" className="flex gap-2">
              <NavLink to="/explore" className={navLink}>
                Explore
              </NavLink>
              <NavLink to="/timeline" className={navLink}>
                Timeline
              </NavLink>
            </nav>
            {/* On phones the search takes its own full-width row below the navigation. */}
            <div className="order-last flex w-full sm:order-none sm:ml-auto sm:w-auto sm:flex-1 sm:justify-end">
              <SearchBox />
            </div>
            <div className="ml-auto sm:ml-0">
              <ChapterButton />
            </div>
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
          <Outlet />
        </main>
        <footer className="border-t border-charcoal-700 px-4 py-4 text-center text-xs text-parchment-500">
          Non-commercial fan project. <i>Attack on Titan</i> belongs to Hajime Isayama and Kodansha.
        </footer>
      </div>
    </ChapterGate>
  );
}
