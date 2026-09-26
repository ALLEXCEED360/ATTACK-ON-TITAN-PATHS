import { m, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { ARTWORK } from "../../art/manifest";
import { useReader } from "../../stores/reader";
import { ChapterPicker } from "./ChapterPicker";

const EASE = [0.16, 1, 0.3, 1] as const;
// Chapter-1-safe: this shows before the reader has said where they are.
const MAP = ARTWORK.find((art) => art.id === "walls-map");

/**
 * Nothing from the dataset is shown until the reader says where they are
 * (docs/model/spoilers.md §1). The boot screen plays first; then first-time readers get this
 * one question. It can't be skipped, but finishing is one click.
 */
export function ChapterGate({ children }: { children: ReactNode }) {
  const cutoff = useReader((state) => state.cutoff);
  const setCutoff = useReader((state) => state.setCutoff);
  if (cutoff !== null) return children;
  return <ChapterQuestion onChapter={setCutoff} />;
}

/** The Wall on the horizon: a long rampart with a gate, drawn over a sunrise glow. */
function Horizon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1600 200"
      preserveAspectRatio="none"
      className="absolute inset-x-0 bottom-0 -z-10 h-[22vh] w-full"
    >
      <defs>
        <linearGradient id="glow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b8913f" stopOpacity="0" />
          <stop offset="1" stopColor="#b8913f" stopOpacity="0.24" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="1600" height="120" fill="url(#glow)" />
      <path d="M0 118 H700 V104 H724 V96 H876 V104 H900 V118 H1600 V200 H0 Z" fill="#0a0b09" />
      <path d="M770 200 V142 Q800 118 830 142 V200 Z" fill="#1a1c19" />
      <path d="M0 118 H700 V104 H724 V96 H876 V104 H900 V118 H1600" fill="none" stroke="#7a5f28" />
    </svg>
  );
}

function ChapterQuestion({ onChapter }: { onChapter: (chapter: number) => void }) {
  const reduce = useReducedMotion();

  return (
    <main className="relative isolate flex min-h-dvh overflow-hidden bg-ink">
      {MAP && (
        <img
          src={MAP.src}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 -z-20 h-full w-full object-cover opacity-[0.13] [filter:sepia(0.6)_contrast(1.2)]"
        />
      )}
      <span
        aria-hidden="true"
        className="kanji-watermark absolute top-1/2 right-[-4vw] -z-10 -translate-y-1/2 text-[38vw] lg:text-[30rem]"
      >
        何話
      </span>
      <Horizon />

      <m.section
        aria-labelledby="gate-title"
        className="mx-auto flex w-full max-w-6xl flex-col justify-center gap-8 px-6 pb-[18vh] lg:px-10"
        initial={{ opacity: 0, x: reduce ? 0 : -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.9, ease: EASE }}
      >
        <header className="flex max-w-2xl flex-col gap-4">
          <span className="ribbon self-start">Before you enter</span>
          <h1 id="gate-title" className="gothic text-6xl text-bone sm:text-8xl">
            Where are you in the story?
          </h1>
          <p className="prose-story">
            PATHS maps the manga&apos;s characters, events and secrets across time. So it never
            spoils anything, tell it the last chapter you&apos;ve read. You can change this at any
            time.
          </p>
        </header>
        <div className="max-w-xl">
          <ChapterPicker variant="hero" onConfirm={onChapter} />
        </div>
      </m.section>
    </main>
  );
}
