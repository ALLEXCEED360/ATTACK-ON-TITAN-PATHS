import {
  EDGE_CATEGORIES,
  ENTITY_KINDS,
  FIRST_CHAPTER,
  InUniverseDateSchema,
  LAST_CHAPTER,
  encodeBound,
} from "@paths/shared";
import { z } from "zod";

// Shared request and response pieces.

export const Cutoff = z.coerce
  .number()
  .int()
  .min(FIRST_CHAPTER)
  .max(LAST_CHAPTER)
  .describe("The last manga chapter the reader has read. Nothing revealed later is returned.");

/** A moment in world time: `YYYY`, `YYYY-MM` or `YYYY-MM-DD`; years may be negative. */
export const At = z
  .string()
  .regex(/^-?\d+(-\d{1,2}(-\d{1,2})?)?$/, "use YYYY, YYYY-MM or YYYY-MM-DD")
  .transform((value, ctx) => {
    const negative = value.startsWith("-");
    const [year = 0, month = 1, day = 1] = (negative ? value.slice(1) : value)
      .split("-")
      .map(Number);
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      ctx.addIssue({ code: "custom", message: "month or day out of range" });
      return z.NEVER;
    }
    return encodeBound(negative ? -year : year, month, day);
  })
  .optional()
  .describe(
    "A moment in world time (YYYY, YYYY-MM or YYYY-MM-DD). Missing month/day mean the 1st.",
  );

export const EntityId = z.string().min(1).max(100);

export const EntityKindEnum = z.enum(ENTITY_KINDS);
export const EdgeCategoryEnum = z.enum(EDGE_CATEGORIES);

/** A comma-separated list in a query string, e.g. `?categories=structural,event`. */
export function csv<T extends z.ZodType<string, string>>(item: T) {
  return z
    .string()
    .transform((value) => value.split(",").filter(Boolean))
    .pipe(z.array(item));
}

export const Citation = z.union([z.number(), z.tuple([z.number(), z.number()])]);

export const Fact = z.object({
  date: InUniverseDateSchema,
  certainty: z.enum(["stated", "inferred"]),
  sources: z.array(Citation),
  notes: z.string().optional(),
});

export const EntitySummary = z.object({
  id: z.string(),
  kind: EntityKindEnum,
  name: z.string(),
});

export const ErrorBody = z.object({
  error: z.string(),
  message: z.string(),
});
