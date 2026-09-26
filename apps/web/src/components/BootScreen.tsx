import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { API_URL } from "../api/client";

const EASE = [0.16, 1, 0.3, 1] as const;
/** The shortest the boot plays, so it reads as a sequence rather than a flicker. */
const MIN_MS = 2600;
/** The longest it waits for the API to wake before letting the reader in anyway. */
const MAX_MS = 6000;

// The three Walls, outermost first, as concentric rings.
const WALLS = [
  { name: "Wall Maria", r: 150, delay: 0.15 },
  { name: "Wall Rose", r: 108, delay: 0.55 },
  { name: "Wall Sina", r: 66, delay: 0.95 },
];

type Status = "waking" | "online" | "offline";

/**
 * Plays on every visit: the Walls draw in around 道 ("Paths"), the wordmark rises, and the archive
 * reports in. Meanwhile it wakes the API (the free host sleeps), so the first page loads warm.
 * Any key or click skips it; reduced motion shortens it to a fade.
 */
export function BootScreen({ onDone }: { onDone: () => void }) {
  const reduce = useReducedMotion();
  const [status, setStatus] = useState<Status>("waking");
  const [minElapsed, setMinElapsed] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const giveUp = window.setTimeout(() => {
      controller.abort();
    }, MAX_MS);
    fetch(`${API_URL}/health`, { signal: controller.signal })
      .then((response) => {
        setStatus(response.ok ? "online" : "offline");
      })
      .catch(() => {
        setStatus("offline");
      });
    const min = window.setTimeout(
      () => {
        setMinElapsed(true);
      },
      reduce ? 400 : MIN_MS,
    );
    const skip = () => {
      setLeaving(true);
    };
    window.addEventListener("keydown", skip);
    window.addEventListener("pointerdown", skip);
    return () => {
      controller.abort();
      window.clearTimeout(giveUp);
      window.clearTimeout(min);
      window.removeEventListener("keydown", skip);
      window.removeEventListener("pointerdown", skip);
    };
  }, [reduce]);

  const ready = leaving || (minElapsed && status !== "waking");

  const statusText =
    status === "waking"
      ? "Contacting the archive…"
      : status === "online"
        ? "Archive online"
        : "Archive unreachable — continuing offline";

  return (
    <AnimatePresence onExitComplete={onDone}>
      {!ready && (
        <m.div
          key="boot"
          role="status"
          aria-label={`Loading PATHS. ${statusText}`}
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden bg-ink"
          exit={{
            opacity: 0,
            scale: 1.04,
            transition: { duration: reduce ? 0.2 : 0.6, ease: EASE },
          }}
        >
          <div aria-hidden="true" className="halftone absolute inset-0 opacity-40" />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(60%_55%_at_50%_45%,transparent,var(--color-ink)_80%)]"
          />

          <div aria-hidden="true" className="relative flex items-center justify-center">
            <m.span
              className="absolute font-[family-name:var(--font-kanji)] text-[26rem] leading-none text-bone/[0.05] sm:text-[34rem]"
              initial={{ opacity: 0, scale: 1.25 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 2.4, ease: EASE }}
            >
              道
            </m.span>
            <svg
              viewBox="-190 -190 380 380"
              className="relative h-[min(70vw,380px)] w-[min(70vw,380px)]"
            >
              {WALLS.map((wall) => (
                <g key={wall.name}>
                  <m.circle
                    r={wall.r}
                    fill="none"
                    stroke="var(--color-bone)"
                    strokeWidth={wall.r === 150 ? 2 : 1.25}
                    strokeOpacity={0.85}
                    initial={{ pathLength: 0, rotate: -90 }}
                    animate={{ pathLength: 1 }}
                    transition={{
                      duration: reduce ? 0 : 0.9,
                      delay: reduce ? 0 : wall.delay,
                      ease: EASE,
                    }}
                  />
                  <m.text
                    x={wall.r + 8}
                    y={-4}
                    fontSize={8}
                    letterSpacing={2}
                    fontFamily="var(--font-mono)"
                    fill="var(--color-brass-400)"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: reduce ? 0 : wall.delay + 0.5 }}
                  >
                    {wall.name.toUpperCase()}
                  </m.text>
                </g>
              ))}
              {/* The four gate districts jutting from Wall Rose, N/E/S/W. */}
              {[0, 90, 180, 270].map((angle) => (
                <m.rect
                  key={angle}
                  x={-9}
                  y={-116}
                  width={18}
                  height={16}
                  fill="var(--color-brass-500)"
                  transform={`rotate(${String(angle)})`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.9 }}
                  transition={{ delay: reduce ? 0 : 1.3 + angle / 900 }}
                />
              ))}
              <m.circle
                r={4}
                fill="var(--color-blood-500)"
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.6, 1] }}
                transition={{ delay: reduce ? 0 : 1.5, duration: 0.5 }}
              />
            </svg>
          </div>

          <m.div
            className="relative mt-4 flex flex-col items-center gap-2"
            initial={{ opacity: 0, y: reduce ? 0 : 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduce ? 0 : 1.2, duration: 0.9, ease: EASE }}
          >
            <p className="gothic text-7xl text-bone sm:text-8xl">Paths</p>
            <p className="font-mono text-[0.65rem] tracking-[0.4em] text-brass-400 uppercase">
              Attack on Titan · <span className="kanji tracking-[0.2em]">進撃の巨人</span>
            </p>
          </m.div>

          <div className="absolute inset-x-0 bottom-10 flex flex-col items-center gap-3 px-6">
            <div className="relative h-px w-[min(22rem,80vw)] overflow-hidden bg-charcoal-700">
              <m.div
                className="absolute inset-y-0 left-0 bg-brass-400"
                initial={{ width: "0%" }}
                animate={{ width: status === "waking" ? "70%" : "100%" }}
                transition={{
                  duration: status === "waking" ? MIN_MS / 1000 : 0.4,
                  ease: "easeOut",
                }}
              />
            </div>
            <p className="font-mono text-[0.65rem] tracking-[0.25em] text-parchment-500 uppercase">
              Survey Corps archive · {statusText}
            </p>
            <p className="font-mono text-[0.6rem] tracking-[0.2em] text-parchment-500 uppercase">
              Press any key to skip
            </p>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
