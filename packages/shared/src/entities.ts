import { z } from "zod";
import { ChapterSchema, CitationsSchema, citationsCover } from "./chapters.ts";
import { resolveDate } from "./dates.ts";
import { EdgeInFileSchema } from "./edges.ts";
import { type DatedFact, DatedFactSchema, checkFact, factShape } from "./facts.ts";
import { type EntityKind, EntityIdSchema, kindOfId } from "./ids.ts";
import { type DescriptionSegment, DescriptionSchema, type Name, NamesSchema } from "./text.ts";

// One YAML file per entity (docs/conventions/ids.md, docs/model/spoilers.md §3).

const entityShape = {
  id: EntityIdSchema,
  names: NamesSchema,
  description: DescriptionSchema.default([]),
  /** Chapter of first appearance. */
  revealedIn: ChapterSchema,
  sources: CitationsSchema,
  notes: z.string().trim().min(1).optional(),
  edges: z.array(EdgeInFileSchema).default([]),
};

interface EntityLike {
  id: string;
  names: Name[];
  description: DescriptionSegment[];
  revealedIn: number;
  sources: (number | [number, number])[];
}

/** Rules every entity follows, whatever its kind. */
function checkEntity(kind: EntityKind, entity: EntityLike, ctx: z.RefinementCtx): void {
  const issue = (path: PropertyKey[], message: string) => {
    ctx.addIssue({ code: "custom", path, message });
  };

  if (kindOfId(entity.id) !== kind) {
    issue(["id"], `a ${kind} ID must start with \`${kind}_\``);
  }
  if (!citationsCover(entity.sources, entity.revealedIn)) {
    issue(["revealedIn"], "the first-appearance chapter must be one of the cited chapters");
  }
  if (entity.names[0] !== undefined && entity.names[0].revealedIn !== entity.revealedIn) {
    issue(["names", 0, "revealedIn"], "the first name must be revealed with the entity itself");
  }
  entity.names.forEach((name, index) => {
    if (!citationsCover(entity.sources, name.revealedIn)) {
      issue(
        ["names", index, "revealedIn"],
        "each name's reveal chapter must be cited in `sources`",
      );
    }
  });
  entity.description.forEach((segment, index) => {
    if (segment.revealedIn < entity.revealedIn) {
      issue(["description", index, "revealedIn"], "a segment can't be revealed before its entity");
    } else if (!citationsCover(entity.sources, segment.revealedIn)) {
      issue(
        ["description", index, "revealedIn"],
        "each segment's chapter must be cited in `sources`",
      );
    }
  });
}

function checkDatedFacts(
  entity: { revealedIn: number },
  facts: Record<string, DatedFact | undefined>,
  ctx: z.RefinementCtx,
): void {
  for (const [key, fact] of Object.entries(facts)) {
    if (fact !== undefined && fact.revealedIn < entity.revealedIn) {
      ctx.addIssue({
        code: "custom",
        path: [key, "revealedIn"],
        message: "a date can't be revealed before its entity",
      });
    }
  }
}

export const CharacterFileSchema = z
  .strictObject({
    ...entityShape,
    born: DatedFactSchema.optional(),
    died: DatedFactSchema.optional(),
    /** Whether the character is a Subject of Ymir (docs/model/relationships.md §7). */
    subjectOfYmir: z
      .strictObject({ value: z.boolean(), ...factShape })
      .superRefine(checkFact)
      .optional(),
  })
  .superRefine((entity, ctx) => {
    checkEntity("character", entity, ctx);
    checkDatedFacts(entity, { born: entity.born, died: entity.died }, ctx);
    if (entity.born && entity.died) {
      const born = resolveDate(entity.born.date);
      const died = resolveDate(entity.died.date);
      if (died.latest < born.earliest) {
        ctx.addIssue({ code: "custom", path: ["died"], message: "died before being born" });
      }
    }
  });

export const EventFileSchema = z
  .strictObject({
    ...entityShape,
    start: DatedFactSchema,
    end: DatedFactSchema.optional(),
    /** Order among events with the same resolved date (docs/model/dates.md §4). */
    seq: z.int().positive().optional(),
  })
  .superRefine((entity, ctx) => {
    checkEntity("event", entity, ctx);
    checkDatedFacts(entity, { start: entity.start, end: entity.end }, ctx);
    if (entity.end) {
      const start = resolveDate(entity.start.date);
      const end = resolveDate(entity.end.date);
      if (end.earliest < start.earliest) {
        ctx.addIssue({
          code: "custom",
          path: ["end"],
          message: "an event can't end before it starts",
        });
      }
    }
  });

export const MemoryFileSchema = z
  .strictObject({
    ...entityShape,
    /** When the memory was originally experienced. */
    start: DatedFactSchema,
  })
  .superRefine((entity, ctx) => {
    checkEntity("memory", entity, ctx);
    checkDatedFacts(entity, { start: entity.start }, ctx);
  });

function plainEntity(kind: EntityKind) {
  return z.strictObject(entityShape).superRefine((entity, ctx) => {
    checkEntity(kind, entity, ctx);
  });
}

export const TitanFileSchema = plainEntity("titan");
export const LocationFileSchema = plainEntity("location");
export const FactionFileSchema = plainEntity("faction");

/** Kinds stored as one file per entity, and the folder each lives in. */
export const ENTITY_FILE_KINDS = {
  character: { folder: "characters", schema: CharacterFileSchema },
  titan: { folder: "titans", schema: TitanFileSchema },
  event: { folder: "events", schema: EventFileSchema },
  location: { folder: "locations", schema: LocationFileSchema },
  faction: { folder: "factions", schema: FactionFileSchema },
  memory: { folder: "memories", schema: MemoryFileSchema },
} as const;

export type FileEntityKind = keyof typeof ENTITY_FILE_KINDS;

export type CharacterFile = z.infer<typeof CharacterFileSchema>;
export type EventFile = z.infer<typeof EventFileSchema>;
export type MemoryFile = z.infer<typeof MemoryFileSchema>;
export type PlainEntityFile = z.infer<typeof TitanFileSchema>;

export type Entity =
  | ({ kind: "character" } & CharacterFile)
  | ({ kind: "event" } & EventFile)
  | ({ kind: "memory" } & MemoryFile)
  | ({ kind: "titan" | "location" | "faction" } & PlainEntityFile);
