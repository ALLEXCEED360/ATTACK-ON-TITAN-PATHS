import type { ReactNode } from "react";
import { useReader } from "../../stores/reader";
import { ChapterPicker } from "./ChapterPicker";

/**
 * Nothing from the dataset is shown until the reader says where they are
 * (docs/model/spoilers.md §1). The question can't be skipped, but finishing is one click.
 */
export function ChapterGate({ children }: { children: ReactNode }) {
  const cutoff = useReader((state) => state.cutoff);
  const setCutoff = useReader((state) => state.setCutoff);

  if (cutoff !== null) return children;

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-8 px-6 py-12">
      <header className="flex flex-col gap-3">
        <p className="label">Attack on Titan: PATHS</p>
        <h1 className="text-3xl font-semibold text-parchment-100">Where are you in the story?</h1>
        <p className="text-parchment-300">
          PATHS maps the manga&apos;s characters, events and secrets across time. So it never spoils
          anything, tell it the last chapter you&apos;ve read. You can change this at any time.
        </p>
      </header>
      <ChapterPicker onConfirm={setCutoff} />
    </main>
  );
}
