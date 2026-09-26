import { AnimatePresence, motion, useIsPresent, useReducedMotion } from "motion/react";
import { useState } from "react";
import { useLocation, useMatches, useOutlet } from "react-router";

const EASE = [0.76, 0, 0.24, 1] as const;

/** Routes that draw edge to edge (e.g. the home page's hero) set `handle: { bleed: true }`. */
function useBleed(): boolean {
  return useMatches().some((match) => (match.handle as { bleed?: boolean } | undefined)?.bleed);
}

/**
 * The current page — or, while it's leaving, the page as it was. Without this the outgoing page
 * would re-render as the incoming one during its exit animation.
 */
function PresentOutlet() {
  const outlet = useOutlet();
  const bleed = useBleed();
  const present = useIsPresent();
  const [kept, setKept] = useState({ outlet, bleed });
  if (present && (kept.outlet !== outlet || kept.bleed !== bleed)) setKept({ outlet, bleed });
  const shown = present ? { outlet, bleed } : kept;

  return shown.bleed ? (
    shown.outlet
  ) : (
    <div className="mx-auto w-full max-w-7xl px-4 py-8">{shown.outlet}</div>
  );
}

/** A skewed ink panel with a brass edge that sweeps across between sections. */
function Curtain() {
  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed inset-y-0 -left-[20vw] z-50 w-[140vw] -skew-x-12 bg-ink"
      initial={{ x: "0%" }}
      animate={{ x: "110%", transition: { duration: 0.55, ease: EASE, delay: 0.05 } }}
      exit={{ x: ["-110%", "0%"], transition: { duration: 0.42, ease: EASE } }}
    >
      <div className="absolute inset-y-0 right-0 w-0.5 bg-brass-400 shadow-[0_0_24px_4px_rgb(207_168_85/0.5)]" />
      <div className="absolute inset-y-0 right-3 w-px bg-brass-700" />
    </motion.div>
  );
}

/**
 * Page transitions. Moving between sections (home, explore, timeline…) wipes the screen; moving
 * within one (entity to entity) only fades the content. Reduced motion gets a short fade.
 */
export function RouteTransition() {
  const { pathname } = useLocation();
  const reduce = useReducedMotion();
  const section = pathname.split("/")[1] ?? "";

  return (
    <AnimatePresence
      mode="wait"
      initial={false}
      onExitComplete={() => {
        window.scrollTo(0, 0);
      }}
    >
      <motion.div
        key={section}
        className="flex flex-1 flex-col"
        initial={{ opacity: reduce ? 0 : 1 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: reduce ? 0 : 1, transition: { duration: reduce ? 0.15 : 0.42 } }}
      >
        <PresentOutlet />
        {!reduce && <Curtain />}
      </motion.div>
    </AnimatePresence>
  );
}
