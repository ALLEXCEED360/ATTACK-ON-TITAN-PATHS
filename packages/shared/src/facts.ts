import { z } from "zod";
import { type Citation, ChapterSchema, CitationsSchema, citationsCover } from "./chapters.ts";
import { InUniverseDateSchema } from "./dates.ts";

// Every fact carries its reveal chapter, citations and certainty
// (docs/canon-and-sources.md §3–4, docs/model/spoilers.md §2).

export const CertaintySchema = z.enum(["stated", "inferred"]);
export type Certainty = z.infer<typeof CertaintySchema>;

export const factShape = {
  revealedIn: ChapterSchema,
  sources: CitationsSchema,
  certainty: CertaintySchema,
  notes: z.string().trim().min(1).optional(),
};

export interface FactFields {
  revealedIn: number;
  sources: Citation[];
  certainty: Certainty;
  notes?: string | undefined;
}

/** Rules shared by every fact: the reveal must be cited, and inferences must be explained. */
export function checkFact(fact: FactFields, ctx: z.RefinementCtx): void {
  if (!citationsCover(fact.sources, fact.revealedIn)) {
    ctx.addIssue({
      code: "custom",
      path: ["revealedIn"],
      message: `revealedIn (ch. ${String(fact.revealedIn)}) must be one of the cited chapters`,
    });
  }
  if (fact.certainty === "inferred" && fact.notes === undefined) {
    ctx.addIssue({
      code: "custom",
      path: ["notes"],
      message: "inferred facts need `notes` explaining the reasoning",
    });
  }
}

/** A date that is itself a fact, such as a birth, a death or an event's start. */
export const DatedFactSchema = z
  .strictObject({ date: InUniverseDateSchema, ...factShape })
  .superRefine(checkFact);
export type DatedFact = z.infer<typeof DatedFactSchema>;
