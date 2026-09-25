import { FIRST_CHAPTER, LAST_CHAPTER } from "@paths/shared/constants";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

// The reader's spoiler cutoff (docs/model/spoilers.md §1). It lives in this browser only — never
// in URLs — so a shared link never carries the sharer's progress to someone else.

export function isChapter(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= FIRST_CHAPTER &&
    value <= LAST_CHAPTER
  );
}

interface ReaderState {
  /** The last chapter read, or null until the reader has answered. */
  cutoff: number | null;
  setCutoff: (chapter: number) => void;
}

export const useReader = create<ReaderState>()(
  persist(
    (set) => ({
      cutoff: null,
      setCutoff: (chapter) => {
        if (isChapter(chapter)) set({ cutoff: chapter });
      },
    }),
    {
      name: "paths:reader",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Ignore anything malformed rather than trusting stored values.
      merge: (persisted, current) => {
        const cutoff = (persisted as { cutoff?: unknown } | undefined)?.cutoff;
        return { ...current, cutoff: isChapter(cutoff) ? cutoff : null };
      },
    },
  ),
);

/** The cutoff inside the chapter gate, where it's always set. */
export function useCutoff(): number {
  const cutoff = useReader((state) => state.cutoff);
  if (cutoff === null) throw new Error("useCutoff() used outside <ChapterGate>");
  return cutoff;
}
