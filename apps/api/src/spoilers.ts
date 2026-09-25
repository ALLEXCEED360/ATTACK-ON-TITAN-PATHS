import type { Citation } from "@paths/shared";
import { z } from "zod";

// Spoiler filtering for response fields (docs/model/spoilers.md §6–7). Anything past the reader's
// cutoff is removed before it is sent, never merely hidden.

/** Citations clipped to the cutoff: later chapters are dropped, ranges are shortened. */
export function visibleCitations(citations: readonly Citation[], cutoff: number): Citation[] {
  return citations.flatMap((citation): Citation[] => {
    if (typeof citation === "number") return citation <= cutoff ? [citation] : [];
    const [from, to] = citation;
    if (from > cutoff) return [];
    const end = Math.min(to, cutoff);
    return [end === from ? from : [from, end]];
  });
}

export function latestCited(citations: readonly Citation[]): number {
  return Math.max(...citations.map((c) => (typeof c === "number" ? c : c[1])));
}

const StoredFact = z.object({
  date: z.unknown(),
  revealedIn: z.number(),
  sources: z.array(z.union([z.number(), z.tuple([z.number(), z.number()])])),
  certainty: z.enum(["stated", "inferred"]),
  notes: z.string().optional(),
});

export interface VisibleFact {
  date: unknown;
  certainty: "stated" | "inferred";
  sources: Citation[];
  notes?: string;
}

/**
 * A dated fact as a reader at `cutoff` may see it, or null if it isn't revealed yet. Reasoning
 * notes are included only once every chapter they draw on has been reached.
 */
export function visibleFact(stored: unknown, cutoff: number): VisibleFact | null {
  if (stored === null || stored === undefined) return null;
  const fact = StoredFact.parse(stored);
  if (fact.revealedIn > cutoff) return null;
  return {
    date: fact.date,
    certainty: fact.certainty,
    sources: visibleCitations(fact.sources, cutoff),
    ...(fact.notes !== undefined && latestCited(fact.sources) <= cutoff
      ? { notes: fact.notes }
      : {}),
  };
}
