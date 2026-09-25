import { z } from "zod";

/** Canon is manga chapters 1–139 (docs/canon-and-sources.md §1). */
export const FIRST_CHAPTER = 1;
export const LAST_CHAPTER = 139;

export const ChapterSchema = z.int().min(FIRST_CHAPTER).max(LAST_CHAPTER);
export type Chapter = z.infer<typeof ChapterSchema>;

/** An inclusive chapter range, written `[from, to]` with from < to. */
export const ChapterRangeSchema = z
  .tuple([ChapterSchema, ChapterSchema])
  .refine(([from, to]) => from < to, "a chapter range must go from a lower to a higher chapter");
export type ChapterRange = z.infer<typeof ChapterRangeSchema>;

/** A citation is a single chapter or an inclusive range (docs/canon-and-sources.md §3). */
export const CitationSchema = z.union([ChapterSchema, ChapterRangeSchema]);
export type Citation = z.infer<typeof CitationSchema>;

export const CitationsSchema = z.array(CitationSchema).min(1, "cite at least one chapter");

export function citationCovers(citation: Citation, chapter: Chapter): boolean {
  return typeof citation === "number"
    ? citation === chapter
    : citation[0] <= chapter && chapter <= citation[1];
}

export function citationsCover(citations: readonly Citation[], chapter: Chapter): boolean {
  return citations.some((citation) => citationCovers(citation, chapter));
}
