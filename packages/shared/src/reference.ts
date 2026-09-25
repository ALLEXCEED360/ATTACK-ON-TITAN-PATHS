import { z } from "zod";
import { ChapterRangeSchema } from "./chapters.ts";
import { EntityIdSchema, idOfKind } from "./ids.ts";

// Reference data in data/reference/ and data/id-redirects.yaml.

/** Collected volumes and their chapters — powers the "where are you?" picker (spoilers.md §1). */
export const VolumesSchema = z.array(
  z.strictObject({
    volume: z.int().positive(),
    chapters: ChapterRangeSchema,
  }),
);
export type Volumes = z.infer<typeof VolumesSchema>;

/** PATHS-defined story arcs (canon-and-sources.md §9). */
export const ArcsSchema = z.array(
  z.strictObject({
    id: idOfKind("arc"),
    name: z.string().trim().min(1),
    chapters: ChapterRangeSchema,
  }),
);
export type Arcs = z.infer<typeof ArcsSchema>;

/** Eras for the timeline's scale (dates.md §9). Years are inclusive. */
export const ErasSchema = z.array(
  z
    .strictObject({
      key: z.string().regex(/^[a-z0-9]+(_[a-z0-9]+)*$/, "use lowercase words joined by `_`"),
      name: z.string().trim().min(1),
      startYear: z.int(),
      endYear: z.int(),
      /** Share of the timeline's width, relative to the other eras. */
      weight: z.number().positive(),
    })
    .refine((era) => era.startYear <= era.endYear, "an era can't end before it starts"),
);
export type Eras = z.infer<typeof ErasSchema>;

/** Retired IDs → their replacement, or null if removed (ids.md §6). */
export const IdRedirectsSchema = z.record(EntityIdSchema, EntityIdSchema.nullable());
export type IdRedirects = z.infer<typeof IdRedirectsSchema>;
