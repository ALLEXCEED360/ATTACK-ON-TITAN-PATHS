import { z } from "zod";
import { type Chapter, ChapterSchema } from "./chapters.ts";

// Names and descriptions change with the reader's cutoff (docs/model/spoilers.md §4–5).

function checkNonDecreasing(items: readonly { revealedIn: number }[], ctx: z.RefinementCtx): void {
  items.forEach((item, index) => {
    const previous = items[index - 1];
    if (previous !== undefined && item.revealedIn < previous.revealedIn) {
      ctx.addIssue({
        code: "custom",
        path: [index, "revealedIn"],
        message: "entries must be ordered by revealedIn",
      });
    }
  });
}

export const NameSchema = z.strictObject({
  name: z.string().trim().min(1),
  revealedIn: ChapterSchema,
  /** Other spellings of this name; they share its revealedIn. */
  variants: z.array(z.string().trim().min(1)).optional(),
});
export type Name = z.infer<typeof NameSchema>;

export const NamesSchema = z.array(NameSchema).min(1).superRefine(checkNonDecreasing);

export const DescriptionSegmentSchema = z.strictObject({
  text: z.string().trim().min(1),
  revealedIn: ChapterSchema,
});
export type DescriptionSegment = z.infer<typeof DescriptionSegmentSchema>;

export const DescriptionSchema = z.array(DescriptionSegmentSchema).superRefine(checkNonDecreasing);

/** The display name at a cutoff: the last name revealed by then. */
export function displayName(names: readonly Name[], cutoff: Chapter): string | undefined {
  return names.findLast((name) => name.revealedIn <= cutoff)?.name;
}

/** Every name and spelling a reader at this cutoff may search for. */
export function searchableNames(names: readonly Name[], cutoff: Chapter): string[] {
  return names
    .filter((name) => name.revealedIn <= cutoff)
    .flatMap((name) => [name.name, ...(name.variants ?? [])]);
}

export function visibleDescription(
  description: readonly DescriptionSegment[],
  cutoff: Chapter,
): string[] {
  return description.filter((segment) => segment.revealedIn <= cutoff).map((s) => s.text);
}
