import { z } from "zod";

/** Entity kinds (docs/conventions/ids.md §2). The ID prefix determines the kind. */
export const ENTITY_KINDS = [
  "character",
  "titan",
  "event",
  "location",
  "faction",
  "arc",
  "memory",
] as const;
export type EntityKind = (typeof ENTITY_KINDS)[number];

const ID_PATTERN = new RegExp(`^(${ENTITY_KINDS.join("|")})_[a-z0-9]+(_[a-z0-9]+)*$`);

export const EntityIdSchema = z
  .string()
  .regex(ID_PATTERN, "IDs look like `<kind>_<slug>`, e.g. `character_eren_yeager`");
export type EntityId = z.infer<typeof EntityIdSchema>;

/** An ID that must belong to one specific kind, e.g. `idOfKind("event")`. */
export function idOfKind(kind: EntityKind) {
  return EntityIdSchema.refine((id) => kindOfId(id) === kind, `expected a ${kind} ID`);
}

export function kindOfId(id: string): EntityKind | undefined {
  return ENTITY_KINDS.find((kind) => id.startsWith(`${kind}_`));
}
