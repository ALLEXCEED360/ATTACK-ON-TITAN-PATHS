import type { Artwork } from "./manifest";

const KANJI: Record<string, string> = {
  character: "人",
  titan: "巨",
  event: "戦",
  location: "地",
  faction: "団",
  memory: "憶",
};

/**
 * A portrait in a slanted, bone-bordered frame over a halftone colour slab — a game's character
 * art, in the Survey Corps' colours (green for people, blood for Titans). Without art, the slab
 * carries the kind's kanji instead, so every entity still gets a card.
 */
export function Portrait({
  art,
  kind,
  name,
  size = "lg",
  eager = false,
}: {
  art: Artwork | undefined;
  kind: string;
  name: string;
  size?: "sm" | "lg";
  eager?: boolean;
}) {
  const titan = kind === "titan";
  const lg = size === "lg";

  return (
    <div className={`relative ${lg ? "-rotate-2" : ""}`}>
      {/* The colour slab behind, offset like a drop shadow. */}
      <div
        aria-hidden="true"
        className={`slab absolute inset-0 ${lg ? "translate-x-3 translate-y-3" : "translate-x-1.5 translate-y-1.5"} ${
          titan ? "bg-blood-600" : "bg-cloak-700"
        }`}
      >
        <div className="halftone absolute inset-0" />
      </div>
      {/* The bone border, then the image inset within it. */}
      <div className={`slab relative bg-bone ${lg ? "p-1.5" : "p-1"}`}>
        <div className="slab relative aspect-square overflow-hidden bg-charcoal-900">
          {art ? (
            <img
              src={art.src}
              alt={art.alt}
              width={art.width}
              height={art.height}
              loading={eager ? "eager" : "lazy"}
              decoding="async"
              className="h-full w-full object-cover"
              style={{ objectPosition: art.focus }}
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center"
              role="img"
              aria-label={name}
            >
              <span
                aria-hidden="true"
                className={`kanji ${lg ? "text-[9rem]" : "text-5xl"} ${titan ? "text-blood-400/40" : "text-parchment-500/25"}`}
              >
                {KANJI[kind] ?? "人"}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
