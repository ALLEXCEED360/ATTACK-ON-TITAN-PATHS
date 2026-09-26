import { Link } from "react-router";
import type { Artwork } from "./manifest";

// Fades are masks on the image itself, so it dissolves into whatever is behind it.
const FADES = {
  none: undefined,
  left: "linear-gradient(to right, transparent, #000 45%)",
  bottom: "linear-gradient(to top, transparent, #000 40%)",
  both: "linear-gradient(to right, transparent, #000 45%), linear-gradient(to top, transparent, #000 35%)",
} as const;

/**
 * An artwork in the site's grade: slightly desaturated, faded into the page so text can sit on
 * it. The credit line links to the Credits page; pass `credit={false}` where one is already shown.
 */
export function ArtImage({
  art,
  className = "",
  fade = "none",
  eager = false,
  credit = true,
}: {
  art: Artwork;
  className?: string;
  fade?: keyof typeof FADES;
  eager?: boolean;
  credit?: boolean;
}) {
  return (
    // Positioned by the caller when it's a backdrop; otherwise it anchors its own overlays.
    <figure
      className={`overflow-hidden ${/\b(absolute|fixed)\b/.test(className) ? "" : "relative"} ${className}`}
    >
      <img
        src={art.src}
        alt={art.alt}
        width={art.width}
        height={art.height}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        className="h-full w-full object-cover [filter:saturate(0.85)_contrast(1.06)]"
        style={{
          objectPosition: art.focus,
          maskImage: FADES[fade],
          maskComposite: fade === "both" ? "intersect" : undefined,
        }}
      />
      {credit && <ArtCredit art={art} className="absolute right-3 bottom-2" />}
    </figure>
  );
}

export function ArtCredit({ art, className = "" }: { art: Artwork; className?: string }) {
  return (
    <figcaption
      className={`font-mono text-[0.6rem] tracking-wider text-parchment-500/80 ${className}`}
    >
      <Link to="/credits" className="hover:text-parchment-100">
        Art: {art.credit.artist}
      </Link>
    </figcaption>
  );
}
