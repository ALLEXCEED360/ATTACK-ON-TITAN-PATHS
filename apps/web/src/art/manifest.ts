// Every image the site shows (docs/canon-and-sources.md §8, decision 0010). Artwork is spoiler-
// gated like data: an image appears only once the reader has reached `revealedIn`, which is never
// earlier than the chapter it was published with. Files are made by scripts/extract_art.py.

export interface Artwork {
  id: string;
  /** Path under public/. */
  src: string;
  width: number;
  height: number;
  alt: string;
  /** Entities it depicts, so pages about them can use it. */
  subjects: readonly string[];
  /** The chapter from which showing it spoils nothing. */
  revealedIn: number;
  /** Where to centre it when it's cropped by the layout (CSS object-position). */
  focus: string;
  credit: {
    artist: string;
    kind: "official" | "fan";
    /** What it is and where it was first published. */
    source: string;
    url?: string;
  };
}

const ISAYAMA = "Hajime Isayama";

export const ARTWORK: readonly Artwork[] = [
  {
    id: "walls-map",
    src: "/art/walls-map.webp",
    width: 560,
    height: 815,
    alt: "A hand-drawn parchment map of the lands inside and beyond the Walls.",
    subjects: [],
    revealedIn: 1,
    focus: "50% 40%",
    credit: {
      artist: ISAYAMA,
      kind: "official",
      source: "Inside cover art, volume 2 (Kodansha)",
    },
  },
  {
    id: "colossal-arm",
    src: "/art/colossal-arm.webp",
    width: 790,
    height: 330,
    alt: "The skinless arm of the Colossal Titan sweeping across a blue sky above the Wall.",
    subjects: ["titan_colossal"],
    revealedIn: 4,
    focus: "40% 50%",
    credit: {
      artist: ISAYAMA,
      kind: "official",
      source: "Colour spread, chapter 4, Bessatsu Shōnen Magazine (Kodansha)",
    },
  },
  {
    id: "titan-horde",
    src: "/art/titan-horde.webp",
    width: 814,
    height: 360,
    alt: "A crowd of grinning Titans climbing over a spiked net towards the rooftops.",
    subjects: ["event_battle_of_trost"],
    revealedIn: 11,
    focus: "50% 30%",
    credit: {
      artist: ISAYAMA,
      kind: "official",
      source: "Colour page, chapter 11, Bessatsu Shōnen Magazine (Kodansha)",
    },
  },
  {
    id: "volume-3",
    src: "/art/volume-3.webp",
    width: 648,
    height: 765,
    alt: "A skeletal, half-formed Titan looms out of steam behind two young soldiers.",
    subjects: ["character_eren_yeager", "character_armin_arlert", "character_mikasa_ackerman"],
    revealedIn: 13,
    focus: "55% 25%",
    credit: {
      artist: ISAYAMA,
      kind: "official",
      source: "Cover art, volume 3 (Kodansha)",
    },
  },
  {
    id: "mikasa-rooftops",
    src: "/art/mikasa-rooftops.webp",
    width: 743,
    height: 662,
    alt: "Mikasa, blades drawn and scarf trailing, leaps across the rooftops against a burning sunset.",
    subjects: ["character_mikasa_ackerman"],
    revealedIn: 14,
    focus: "55% 20%",
    credit: {
      artist: ISAYAMA,
      kind: "official",
      source: "Colour page, chapter 14, Bessatsu Shōnen Magazine (Kodansha)",
    },
  },
];

/** Artwork the reader may see at `cutoff`, optionally only of one subject. Latest first. */
export function artworkAt(cutoff: number, subject?: string): Artwork[] {
  return ARTWORK.filter(
    (art) => art.revealedIn <= cutoff && (subject === undefined || art.subjects.includes(subject)),
  ).sort((a, b) => b.revealedIn - a.revealedIn);
}

/** The best key art for a page at `cutoff`: the most recent the reader may see, if any. */
export function heroArt(cutoff: number, preferred: readonly string[] = []): Artwork | undefined {
  const visible = artworkAt(cutoff).filter((art) => art.id !== "walls-map");
  return preferred.map((id) => visible.find((art) => art.id === id)).find(Boolean) ?? visible[0];
}
