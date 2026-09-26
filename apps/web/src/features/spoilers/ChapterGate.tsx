import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { ARTWORK } from "../../art/manifest";
import { useReader } from "../../stores/reader";
import { ChapterPicker } from "./ChapterPicker";

const EASE = [0.16, 1, 0.3, 1] as const;
// Chapter-1-safe: the title screen shows before the reader has said where they are.
const MAP = ARTWORK.find((art) => art.id === "walls-map");

/**
 * Nothing from the dataset is shown until the reader says where they are
 * (docs/model/spoilers.md §1). First visits open on a title screen; the question can't be
 * skipped, but finishing is one click.
 */
export function ChapterGate({ children }: { children: ReactNode }) {
  const cutoff = useReader((state) => state.cutoff);
  const setCutoff = useReader((state) => state.setCutoff);
  if (cutoff !== null) return children;
  return <TitleScreen onChapter={setCutoff} />;
}

/** The Wall on the horizon: a long rampart with a gate, drawn over a sunrise glow. */
function Horizon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1600 200"
      preserveAspectRatio="none"
      className="absolute inset-x-0 bottom-0 h-[26vh] w-full"
    >
      <defs>
        <linearGradient id="glow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b8913f" stopOpacity="0" />
          <stop offset="1" stopColor="#b8913f" stopOpacity="0.28" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="1600" height="120" fill="url(#glow)" />
      <path d="M0 118 H700 V104 H724 V96 H876 V104 H900 V118 H1600 V200 H0 Z" fill="#0a0b09" />
      <path d="M770 200 V142 Q800 118 830 142 V200 Z" fill="#1a1c19" />
      <path d="M0 118 H700 V104 H724 V96 H876 V104 H900 V118 H1600" fill="none" stroke="#7a5f28" />
    </svg>
  );
}

function TitleScreen({ onChapter }: { onChapter: (chapter: number) => void }) {
  const [step, setStep] = useState<"title" | "chapter">("title");
  const reduce = useReducedMotion();
  const begin = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (step !== "title") return;
    begin.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Tab" || event.metaKey || event.ctrlKey || event.altKey) return;
      event.preventDefault();
      setStep("chapter");
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [step]);

  const letters = "PATHS".split("");

  return (
    <main className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-ink">
      {MAP && (
        <m.img
          src={MAP.src}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 -z-10 h-full w-full object-cover opacity-[0.16] [filter:sepia(0.6)_contrast(1.2)]"
          initial={{ scale: reduce ? 1 : 1.15 }}
          animate={{ scale: 1 }}
          transition={{ duration: 24, ease: "linear" }}
        />
      )}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(90%_70%_at_50%_45%,transparent,var(--color-ink)_85%)]"
      />
      <Horizon />

      <AnimatePresence mode="wait">
        {step === "title" ? (
          <m.section
            key="title"
            className="flex flex-1 flex-col items-center justify-center gap-6 px-6 pb-[18vh] text-center"
            exit={{ opacity: 0, y: -30, filter: "blur(6px)", transition: { duration: 0.45 } }}
          >
            <m.p
              className="label text-brass-400"
              initial={{ opacity: 0, letterSpacing: "0.6em" }}
              animate={{ opacity: 1, letterSpacing: "0.3em" }}
              transition={{ duration: 1.6, ease: EASE }}
            >
              Attack on Titan
            </m.p>
            <h1
              aria-label="PATHS"
              className="display flex text-[clamp(6rem,24vw,19rem)] text-parchment-50"
            >
              {letters.map((letter, i) => (
                <m.span
                  key={letter}
                  aria-hidden="true"
                  initial={{ opacity: 0, y: reduce ? 0 : 80, rotateX: reduce ? 0 : -60 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0 }}
                  transition={{ duration: 1.1, ease: EASE, delay: 0.25 + i * 0.08 }}
                  className="inline-block [text-shadow:0_0_60px_rgb(184_145_63/0.25)]"
                >
                  {letter}
                </m.span>
              ))}
            </h1>
            <m.div
              className="hairline w-[min(34rem,80vw)]"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1.2, ease: EASE, delay: 0.8 }}
            />
            <m.p
              className="max-w-xl font-serif text-lg text-parchment-300 italic sm:text-xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.2, delay: 1.1 }}
            >
              Every person, battle and secret of the manga — connected across time, and never a page
              past where you are.
            </m.p>
            <m.button
              ref={begin}
              type="button"
              onClick={() => {
                setStep("chapter");
              }}
              className="mt-6 font-mono text-xs tracking-[0.4em] text-brass-300 uppercase"
              initial={{ opacity: 0 }}
              animate={{ opacity: reduce ? 1 : [0.35, 1, 0.35] }}
              transition={
                reduce
                  ? { delay: 1.6 }
                  : { delay: 1.6, duration: 2.4, repeat: Infinity, ease: "easeInOut" }
              }
            >
              Press any key to begin
            </m.button>
          </m.section>
        ) : (
          <m.section
            key="chapter"
            aria-labelledby="gate-title"
            className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-8 px-6 pb-[20vh]"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE }}
          >
            <header className="flex flex-col gap-3">
              <p className="label text-brass-400">Before you enter</p>
              <h1 id="gate-title" className="display text-5xl text-parchment-50 sm:text-6xl">
                Where are you in the story?
              </h1>
              <p className="prose-story">
                PATHS maps the manga&apos;s characters, events and secrets across time. So it never
                spoils anything, tell it the last chapter you&apos;ve read. You can change this at
                any time.
              </p>
            </header>
            <ChapterPicker variant="hero" onConfirm={onChapter} />
          </m.section>
        )}
      </AnimatePresence>
    </main>
  );
}
