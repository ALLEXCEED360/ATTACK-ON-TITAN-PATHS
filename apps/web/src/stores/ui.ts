import { create } from "zustand";

// Transient UI state shared across components: which overlays are open.

interface UiState {
  paletteOpen: boolean;
  chapterOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
  setChapterOpen: (open: boolean) => void;
}

export const useUi = create<UiState>()((set) => ({
  paletteOpen: false,
  chapterOpen: false,
  setPaletteOpen: (paletteOpen) => {
    set({ paletteOpen });
  },
  setChapterOpen: (chapterOpen) => {
    set({ chapterOpen });
  },
}));
