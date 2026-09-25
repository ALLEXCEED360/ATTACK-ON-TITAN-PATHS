import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

// Recently opened entities, for the command palette. Only IDs are stored: names are looked up
// at the reader's current chapter, so lowering the chapter hides anything no longer revealed.

const MAX_RECENT = 8;

interface RecentState {
  ids: string[];
  add: (id: string) => void;
}

export const useRecent = create<RecentState>()(
  persist(
    (set) => ({
      ids: [],
      add: (id) => {
        set((state) => ({ ids: [id, ...state.ids.filter((x) => x !== id)].slice(0, MAX_RECENT) }));
      },
    }),
    {
      name: "paths:recent",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      merge: (persisted, current) => {
        const ids = (persisted as { ids?: unknown } | undefined)?.ids;
        const valid = Array.isArray(ids)
          ? ids.filter((id): id is string => typeof id === "string").slice(0, MAX_RECENT)
          : [];
        return { ...current, ids: valid };
      },
    },
  ),
);
