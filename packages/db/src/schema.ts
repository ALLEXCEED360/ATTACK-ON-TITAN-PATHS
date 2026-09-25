import {
  EDGE_CATEGORIES,
  EDGE_TYPE_NAMES,
  ENTITY_KINDS,
  type EdgeType,
  type EntityKind,
} from "@paths/shared";
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  customType,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  smallint,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// The database is a derived copy of data/ (docs/decisions/0004-database-schema.md).
// Every table is rebuilt by the seed script; nothing here is edited by hand.

const tsvector = customType<{ data: string }>({ dataType: () => "tsvector" });

export const entityKind = pgEnum("entity_kind", ENTITY_KINDS);
export const edgeType = pgEnum("edge_type", EDGE_TYPE_NAMES as [EdgeType, ...EdgeType[]]);
export const edgeCategory = pgEnum("edge_category", EDGE_CATEGORIES);
export const certainty = pgEnum("certainty", ["stated", "inferred"]);

// Time bounds (the `life*` and `own*` columns) are encoded as sortable integers
// (`year × 10000 + month × 100 + day`, docs/model/dates.md §3). Null means unbounded on that side.

/** Every entity, whatever its kind. Kind-specific fields live in the detail tables below. */
export const entities = pgTable(
  "entities",
  {
    id: text().primaryKey(),
    kind: entityKind().notNull(),
    revealedIn: smallint().notNull(),
    sources: jsonb().notNull(),
    notes: text(),
    /** When the entity exists in world time (born–died, start–end), resolved at seed time. */
    lifeStartEarliest: integer(),
    lifeStartLatest: integer(),
    lifeEndEarliest: integer(),
    lifeEndLatest: integer(),
    /** Chapter revealing each lifetime bound; null means "with the entity" (spoilers.md §3). */
    lifeStartRevealedIn: smallint(),
    lifeEndRevealedIn: smallint(),
  },
  (t) => [
    index("entities_kind_idx").on(t.kind),
    index("entities_revealed_in_idx").on(t.revealedIn),
    check("entities_revealed_in_range", sql`${t.revealedIn} between 1 and 139`),
  ],
);

/** Names and spelling variants, each with its own reveal chapter (docs/model/spoilers.md §4). */
export const entityNames = pgTable(
  "entity_names",
  {
    entityId: text()
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    /** Order of the name in the entity's file; variants share their name's position. */
    position: smallint().notNull(),
    name: text().notNull(),
    /** False for spelling variants, which are searchable but never displayed. */
    isPrimary: boolean().notNull(),
    revealedIn: smallint().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.entityId, t.name] }),
    index("entity_names_trgm_idx").using("gin", sql`lower(${t.name}) gin_trgm_ops`),
  ],
);

/** Description paragraphs, revealed one at a time (docs/model/spoilers.md §5). */
export const descriptionSegments = pgTable(
  "description_segments",
  {
    entityId: text()
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    position: smallint().notNull(),
    text: text().notNull(),
    revealedIn: smallint().notNull(),
    search: tsvector().generatedAlwaysAs(sql`to_tsvector('english', "text")`),
  },
  (t) => [
    primaryKey({ columns: [t.entityId, t.position] }),
    index("description_segments_search_idx").using("gin", t.search),
  ],
);

/** A dated fact (a birth, a death, an event's start) exactly as written in data/. */
export interface DatedFactJson {
  date: unknown;
  revealedIn: number;
  sources: unknown;
  certainty: "stated" | "inferred";
  notes?: string | undefined;
}

export const characters = pgTable("characters", {
  entityId: text()
    .primaryKey()
    .references(() => entities.id, { onDelete: "cascade" }),
  born: jsonb().$type<DatedFactJson>(),
  died: jsonb().$type<DatedFactJson>(),
  subjectOfYmir: jsonb(),
});

export const events = pgTable(
  "events",
  {
    entityId: text()
      .primaryKey()
      .references(() => entities.id, { onDelete: "cascade" }),
    start: jsonb().$type<DatedFactJson>().notNull(),
    end: jsonb().$type<DatedFactJson>(),
    seq: smallint(),
  },
  (t) => [index("events_seq_idx").on(t.seq)],
);

export const memories = pgTable("memories", {
  entityId: text()
    .primaryKey()
    .references(() => entities.id, { onDelete: "cascade" }),
  start: jsonb().$type<DatedFactJson>().notNull(),
});

/** Relationships (docs/model/relationships.md). Both endpoints are real foreign keys. */
export const edges = pgTable(
  "edges",
  {
    /** Derived from (source, type, target, from) by the seed script. */
    id: text().primaryKey(),
    sourceId: text().notNull(),
    targetId: text().notNull(),
    type: edgeType().notNull(),
    category: edgeCategory().notNull(),
    revealedIn: smallint().notNull(),
    sources: jsonb().notNull(),
    certainty: certainty().notNull(),
    notes: text(),
    /** Type-specific attributes such as `role`, `title`, `side`, `in`, `via`. */
    attributes: jsonb().notNull().default({}),
    /** `from` / `until` as written (a date or an event reference). */
    fromRef: jsonb(),
    untilRef: jsonb(),
    /**
     * The edge's own period: its `from`/`until`, or the moment of a killing. Readers see it
     * clipped to both endpoints' lifetimes *as known at their chapter* (see queries.ts).
     */
    ownStartEarliest: integer(),
    ownStartLatest: integer(),
    ownEndEarliest: integer(),
    ownEndLatest: integer(),
    weight: real().notNull(),
  },
  (t) => [
    foreignKey({ columns: [t.sourceId], foreignColumns: [entities.id] }).onDelete("cascade"),
    foreignKey({ columns: [t.targetId], foreignColumns: [entities.id] }).onDelete("cascade"),
    index("edges_source_idx").on(t.sourceId),
    index("edges_target_idx").on(t.targetId),
    index("edges_revealed_in_idx").on(t.revealedIn),
    check("edges_no_self_loop", sql`${t.sourceId} <> ${t.targetId}`),
  ],
);

export const volumes = pgTable("volumes", {
  volume: smallint().primaryKey(),
  firstChapter: smallint().notNull(),
  lastChapter: smallint().notNull(),
});

export const arcs = pgTable("arcs", {
  id: text().primaryKey(),
  name: text().notNull(),
  firstChapter: smallint().notNull(),
  lastChapter: smallint().notNull(),
});

export const eras = pgTable(
  "eras",
  {
    key: text().primaryKey(),
    position: smallint().notNull(),
    name: text().notNull(),
    startYear: integer().notNull(),
    endYear: integer().notNull(),
    weight: real().notNull(),
  },
  (t) => [uniqueIndex("eras_position_idx").on(t.position)],
);

export const idRedirects = pgTable("id_redirects", {
  oldId: text().primaryKey(),
  newId: text().references(() => entities.id, { onDelete: "cascade" }),
});

export type EntityRow = typeof entities.$inferSelect;
export type EdgeRow = typeof edges.$inferSelect;
export type { EdgeType, EntityKind };
