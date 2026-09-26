import { AnimatePresence, m, useIsPresent, useReducedMotion } from "motion/react";
import { useState } from "react";
import { useLocation, useMatches, useOutlet } from "react-router";

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

// Steam clouds: where each billows from (% of the screen), how big (vmax) and when.
const STEAM = [
  { x: 52, y: 88, size: 70, delay: 0.1 },
  { x: 30, y: 72, size: 60, delay: 0.16 },
  { x: 74, y: 70, size: 62, delay: 0.18 },
  { x: 50, y: 50, size: 80, delay: 0.2 },
  { x: 16, y: 40, size: 58, delay: 0.24 },
  { x: 86, y: 36, size: 58, delay: 0.24 },
  { x: 38, y: 16, size: 60, delay: 0.28 },
  { x: 66, y: 12, size: 60, delay: 0.3 },
];

// A jagged bolt from the top of the screen to the ground, with one fork.
const BOLT = "M57 -2 L53 18 L59 22 L49 44 L56 47 L46 70 L52 72 L47 102";
const FORK = "M53 36 L62 48 L58 50 L66 63";

/**
 * The Titan shift: a lightning strike, one warm flash and a burst of transformation steam that
 * covers the page as it leaves (`strike`), then lifts off the new one (`clear`).
 */
function TitanShift() {
  return (
    <m.div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
      variants={{ covered: {}, clear: {}, strike: {} }}
    >
      {/* The dark body of the steam, so the cover is complete wherever the clouds thin out. */}
      <m.div
        className="absolute inset-0 bg-[#2b2824]"
        variants={{
          covered: { opacity: 1 },
          clear: { opacity: 0, transition: { duration: 0.5, delay: 0.1 } },
          strike: { opacity: [0, 1], transition: { duration: 0.28, delay: 0.14 } },
        }}
      />
      {STEAM.map((puff) => (
        <m.div
          key={`${String(puff.x)}-${String(puff.y)}`}
          className="absolute rounded-full"
          style={{
            left: `${String(puff.x)}%`,
            top: `${String(puff.y)}%`,
            width: `${String(puff.size)}vmax`,
            height: `${String(puff.size)}vmax`,
            marginLeft: `-${String(puff.size / 2)}vmax`,
            marginTop: `-${String(puff.size / 2)}vmax`,
            background:
              "radial-gradient(circle, rgb(222 212 192 / 0.95) 0%, rgb(160 150 132 / 0.7) 35%, rgb(60 56 50 / 0) 70%)",
          }}
          variants={{
            covered: { opacity: 1, scale: 1.2, y: "0%" },
            clear: {
              opacity: 0,
              scale: 1.7,
              y: "-30%",
              transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: puff.delay / 2 },
            },
            strike: {
              opacity: [0, 1],
              scale: [0.25, 1.2],
              y: ["0%", "0%"],
              transition: { duration: 0.34, ease: "easeOut", delay: puff.delay },
            },
          }}
        />
      ))}
      {/* The bolt is revealed top-down with a clip; stroke-dash tricks break on a stretched SVG. */}
      <m.div
        className="absolute inset-0"
        style={{ filter: "drop-shadow(0 0 10px #ffd66b) drop-shadow(0 0 28px #e2a93b)" }}
        variants={{
          covered: { opacity: 0 },
          clear: { opacity: 0 },
          strike: {
            clipPath: ["inset(0% 0% 100% 0%)", "inset(0% 0% 0% 0%)", "inset(0% 0% 0% 0%)"],
            opacity: [1, 1, 0],
            transition: { duration: 0.34, times: [0, 0.35, 1], ease: "easeIn" },
          },
        }}
      >
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
          <path
            d={BOLT}
            fill="none"
            stroke="#fff1c4"
            strokeWidth={5}
            strokeLinejoin="miter"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={FORK}
            fill="none"
            stroke="#fff1c4"
            strokeWidth={3}
            strokeLinejoin="miter"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </m.div>
      {/* One warm flash as the bolt lands — never repeated, so it stays photosensitivity-safe. */}
      <m.div
        className="absolute inset-0 bg-[#ffeec4] mix-blend-screen"
        variants={{
          covered: { opacity: 0 },
          clear: { opacity: 0 },
          strike: { opacity: [0, 0.5, 0], transition: { duration: 0.3, delay: 0.08 } },
        }}
      />
    </m.div>
  );
}

/**
 * Page transitions. Moving between sections (home, explore, timeline…) triggers the Titan shift;
 * moving within one (entity to entity) doesn't. Reduced motion gets a short fade instead.
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
      <m.div
        key={section}
        className="flex flex-1 flex-col"
        initial={reduce ? { opacity: 0 } : "covered"}
        animate={reduce ? { opacity: 1 } : "clear"}
        exit={reduce ? { opacity: 0, transition: { duration: 0.15 } } : "strike"}
        variants={{ covered: {}, clear: {}, strike: {} }}
      >
        {/* The page shudders as the bolt lands. Only this wrapper moves: a transform on the
            outer one would pin the fixed steam overlay to the page instead of the screen. */}
        <m.div
          className="flex flex-1 flex-col"
          variants={{
            covered: {},
            clear: {},
            strike: { x: [0, -9, 8, -5, 3, 0], transition: { duration: 0.4, delay: 0.1 } },
          }}
        >
          <PresentOutlet />
        </m.div>
        {!reduce && <TitanShift />}
      </m.div>
    </AnimatePresence>
  );
}
