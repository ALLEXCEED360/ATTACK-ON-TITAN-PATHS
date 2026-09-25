import { z } from "zod";
import { DateRefSchema } from "./dates.ts";
import type { EdgeType } from "./edge-types.ts";
import { checkFact, factShape } from "./facts.ts";
import { EntityIdSchema, idOfKind } from "./ids.ts";

// Edges as written in an entity's file: the file's entity is the source
// (docs/model/relationships.md §2). Kind rules are checked by the validator.

const common = { target: EntityIdSchema, ...factShape };
const time = { from: DateRefSchema.optional(), until: DateRefSchema.optional() };

/** An edge type that may carry `from` / `until`. */
function timedEdge<T extends EdgeType, A extends z.ZodRawShape>(type: T, attributes: A) {
  return z.strictObject({ type: z.literal(type), ...common, ...time, ...attributes });
}

/** An edge type with no time bounds of its own. */
function momentEdge<T extends EdgeType, A extends z.ZodRawShape>(type: T, attributes: A) {
  return z.strictObject({ type: z.literal(type), ...common, ...attributes });
}

const optionalText = z.string().trim().min(1).optional();

export const EDGE_SCHEMAS = [
  // Structural
  momentEdge("parent_of", {}),
  momentEdge("sibling_of", { half: z.boolean().optional() }),
  timedEdge("spouse_of", {}),
  timedEdge("holds", {}),
  timedEdge("member_of", { role: optionalText }),
  timedEdge("leads", { title: optionalText }),
  timedEdge("part_of", {}),
  momentEdge("born_in", {}),
  timedEdge("lives_in", {}),
  timedEdge("based_at", {}),
  timedEdge("controls", {}),
  timedEdge("allied_with", {}),
  timedEdge("at_war_with", {}),
  // Event
  momentEdge("participated_in", { role: optionalText, side: idOfKind("faction").optional() }),
  momentEdge("occurred_at", {}),
  momentEdge("sub_event_of", {}),
  momentEdge("killed", { in: idOfKind("event").optional() }),
  // Causal
  momentEdge("caused", {}),
  // Paths
  momentEdge("experienced", {}),
  timedEdge("received", { via: z.enum(["inheritance", "contact", "paths"]) }),
  momentEdge("depicts", {}),
] as const;

export const EdgeInFileSchema = z.discriminatedUnion("type", EDGE_SCHEMAS).superRefine(checkFact);
export type EdgeInFile = z.infer<typeof EdgeInFileSchema>;

/** An edge with its source filled in from the file it was written in. */
export type Edge = EdgeInFile & { source: string };
