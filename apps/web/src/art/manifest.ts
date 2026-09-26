// Every image the site shows (docs/canon-and-sources.md §8, decision 0010). Artwork is spoiler-
// gated like data: an image appears only once the reader has reached `revealedIn`, which is never
// earlier than the chapter it was published with, nor earlier than its subject's own reveal.
// Illustrations are made by scripts/extract_art.py; portraits and covers by scripts/fetch_art.py.

export interface Artwork {
  id: string;
  /** Illustrations set a scene; portraits show one subject; covers are the collected volumes. */
  kind: "illustration" | "portrait" | "cover";
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

const ILLUSTRATIONS: readonly Artwork[] = [
  {
    id: "walls-map",
    kind: "illustration",
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
    kind: "illustration",
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
    kind: "illustration",
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
    kind: "illustration",
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
    kind: "illustration",
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

const WIKI = "https://attackontitan.fandom.com/wiki/File:";

/**
 * A character or Titan portrait. `revealedIn` is the subject's own reveal chapter (from data/),
 * so a portrait never shows someone before the reader has met them.
 */
function portrait(
  id: string,
  subject: string,
  revealedIn: number,
  width: number,
  height: number,
  label: string,
  medium: "manga" | "anime",
  wikiFile: string,
): Artwork {
  return {
    id,
    kind: "portrait",
    src: `/art/characters/${id}.webp`,
    width,
    height,
    alt: `${label}, as drawn in the ${medium === "manga" ? "manga" : "anime"}.`,
    subjects: [subject],
    revealedIn,
    focus: "50% 30%",
    credit: {
      artist: medium === "manga" ? ISAYAMA : "Wit Studio",
      kind: "official",
      source:
        medium === "manga"
          ? "Manga artwork (Kodansha), via the Attack on Titan Wiki"
          : "Attack on Titan anime (Wit Studio), via the Attack on Titan Wiki",
      url: `${WIKI}${encodeURIComponent(wikiFile.replaceAll(" ", "_"))}`,
    },
  };
}

/** A Japanese volume cover, shown once the reader has finished the volume's last chapter. */
function cover(volume: number, lastChapter: number, width: number, height: number): Artwork {
  const id = `volume-${String(volume).padStart(2, "0")}`;
  return {
    id,
    kind: "cover",
    src: `/art/covers/${id}.webp`,
    width,
    height,
    alt: `Cover of volume ${String(volume)} of the Japanese edition.`,
    subjects: [],
    revealedIn: lastChapter,
    focus: "50% 50%",
    credit: {
      artist: ISAYAMA,
      kind: "official",
      source: `Cover, volume ${String(volume)} (Kodansha), via the Volume Covers Wiki`,
      url: `https://volumecovers.fandom.com/wiki/File:AoTVol${String(volume).padStart(2, "0")}.png`,
    },
  };
}

// Krista has no portrait: the only suitable render shows her from a much later arc.
const PORTRAITS: readonly Artwork[] = [
  portrait(
    "character_annie_leonhart",
    "character_annie_leonhart",
    2,
    700,
    700,
    "Annie Leonhart",
    "manga",
    "Annie Leonhart character image (850).png",
  ),
  portrait(
    "character_armin_arlert",
    "character_armin_arlert",
    1,
    930,
    930,
    "Armin Arlert",
    "manga",
    "Armin Arlert character image (850).png",
  ),
  portrait(
    "character_bertholdt_hoover",
    "character_bertholdt_hoover",
    2,
    1080,
    1080,
    "Bertholdt Hoover",
    "anime",
    "Bertholdt Hoover (Anime) character image.png",
  ),
  portrait(
    "character_carla_yeager",
    "character_carla_yeager",
    1,
    1080,
    1080,
    "Carla Yeager",
    "anime",
    "Carla Jaeger (Anime) character image.png",
  ),
  portrait(
    "character_connie_springer",
    "character_connie_springer",
    2,
    400,
    400,
    "Connie Springer",
    "manga",
    "Connie Springer character image (850).png",
  ),
  portrait(
    "character_darius_zackly",
    "character_darius_zackly",
    19,
    1080,
    1080,
    "Darius Zackly",
    "anime",
    "Dhalis Zachary (Anime) character image.png",
  ),
  portrait(
    "character_dot_pixis",
    "character_dot_pixis",
    11,
    550,
    550,
    "Dot Pixis",
    "manga",
    "Dot Pixis character image.png",
  ),
  portrait(
    "character_dr_yeager",
    "character_dr_yeager",
    1,
    682,
    682,
    "Dr. Yeager",
    "anime",
    "Grisha Jaeger (Anime) character image.png",
  ),
  portrait(
    "character_eren_yeager",
    "character_eren_yeager",
    1,
    1000,
    1000,
    "Eren Yeager",
    "anime",
    "Eren Jaeger (Anime) character image (850).png",
  ),
  portrait(
    "eren-titan",
    "character_eren_yeager",
    11,
    1080,
    1080,
    "Eren's Titan form",
    "anime",
    "Attack Titan (Anime) character image (Eren Jaeger).png",
  ),
  portrait(
    "character_erwin_smith",
    "character_erwin_smith",
    19,
    1080,
    1080,
    "Erwin Smith",
    "manga",
    "Erwin Smith character image.png",
  ),
  portrait(
    "character_hange_zoe",
    "character_hange_zoe",
    19,
    859,
    859,
    "Hange Zoë",
    "manga",
    "Hange Zoë character image (850).png",
  ),
  portrait(
    "character_hannes",
    "character_hannes",
    1,
    324,
    324,
    "Hannes",
    "manga",
    "Hannes character image.png",
  ),
  portrait(
    "character_jean_kirstein",
    "character_jean_kirstein",
    2,
    1080,
    1080,
    "Jean Kirstein",
    "manga",
    "Jean Kirstein character image (850).png",
  ),
  portrait(
    "character_levi",
    "character_levi",
    19,
    960,
    960,
    "Levi",
    "anime",
    "Levi Ackermann (Anime) character image (850).png",
  ),
  portrait(
    "character_marco_bott",
    "character_marco_bott",
    2,
    372,
    372,
    "Marco Bott",
    "manga",
    "Marco Bott character image.png",
  ),
  portrait(
    "character_mikasa_ackerman",
    "character_mikasa_ackerman",
    1,
    372,
    372,
    "Mikasa Ackerman",
    "manga",
    "Mikasa Ackerman character image (850).png",
  ),
  portrait(
    "character_mike_zacharias",
    "character_mike_zacharias",
    19,
    632,
    632,
    "Mike Zacharias",
    "manga",
    "Mike Zacharias character image.png",
  ),
  portrait(
    "character_reiner_braun",
    "character_reiner_braun",
    2,
    343,
    343,
    "Reiner Braun",
    "manga",
    "Reiner Braun character image (850).png",
  ),
  portrait(
    "character_sasha_blouse",
    "character_sasha_blouse",
    2,
    1080,
    1080,
    "Sasha Blouse",
    "anime",
    "Sasha Braus (Anime) character image (850).png",
  ),
  portrait(
    "character_smiling_titan",
    "character_smiling_titan",
    2,
    620,
    620,
    "The Smiling Titan",
    "manga",
    "Dina Fritz character image (Titan).png",
  ),
  portrait(
    "character_thomas_wagner",
    "character_thomas_wagner",
    4,
    1024,
    1024,
    "Thomas Wagner",
    "manga",
    "Thomas Wagner character image.png",
  ),
  portrait(
    "character_ymir_104th",
    "character_ymir_104th",
    40,
    573,
    573,
    "Ymir",
    "manga",
    "Ymir character image.png",
  ),
  portrait(
    "titan_armored",
    "titan_armored",
    15,
    700,
    700,
    "The Armored Titan",
    "manga",
    "Armored Titan character image (Reiner Braun).png",
  ),
  portrait(
    "titan_colossal",
    "titan_colossal",
    2,
    1080,
    1080,
    "The Colossal Titan",
    "anime",
    "Colossal Titan (Anime) character image (Bertholdt Hoover).png",
  ),
  portrait(
    "titan_female",
    "titan_female",
    23,
    847,
    847,
    "The Female Titan",
    "manga",
    "Female Titan character image (Annie Leonhart).png",
  ),
];

const COVERS: readonly Artwork[] = [
  cover(1, 4, 1000, 1511),
  cover(2, 9, 1000, 1479),
  cover(3, 13, 1000, 1462),
  cover(4, 17, 869, 1288),
  cover(5, 21, 948, 1400),
  cover(6, 25, 944, 1413),
  cover(7, 29, 640, 963),
  cover(8, 34, 640, 964),
  cover(9, 38, 640, 970),
  cover(10, 42, 1000, 1495),
  cover(11, 46, 855, 1280),
  cover(12, 50, 995, 1496),
  cover(13, 54, 1000, 1495),
];

export const ARTWORK: readonly Artwork[] = [...ILLUSTRATIONS, ...PORTRAITS, ...COVERS];

/** Artwork the reader may see at `cutoff`, optionally only of one subject. Latest first. */
export function artworkAt(cutoff: number, subject?: string): Artwork[] {
  return ARTWORK.filter(
    (art) => art.revealedIn <= cutoff && (subject === undefined || art.subjects.includes(subject)),
  ).sort((a, b) => b.revealedIn - a.revealedIn);
}

/** The best key art for a page at `cutoff`: the most recent the reader may see, if any. */
export function heroArt(cutoff: number, preferred: readonly string[] = []): Artwork | undefined {
  const visible = artworkAt(cutoff).filter(
    (art) => art.kind === "illustration" && art.id !== "walls-map",
  );
  return preferred.map((id) => visible.find((art) => art.id === id)).find(Boolean) ?? visible[0];
}

/** The portrait of one entity the reader may see, preferring its plain (non-Titan) likeness. */
export function portraitOf(cutoff: number, subject: string): Artwork | undefined {
  const all = artworkAt(cutoff, subject).filter((art) => art.kind === "portrait");
  return all.find((art) => art.id === subject) ?? all[0];
}

/** Every portrait of an entity the reader may see (e.g. Eren and his Titan form). */
export function portraitsOf(cutoff: number, subject: string): Artwork[] {
  const all = artworkAt(cutoff, subject).filter((art) => art.kind === "portrait");
  // Their own likeness first, then other forms (e.g. a Titan) in reveal order.
  return [...all.filter((art) => art.id === subject), ...all.filter((art) => art.id !== subject)];
}
