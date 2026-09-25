import { type Db, schema } from "@paths/db";
import { viewGraph } from "@paths/graph-core";
import type { Citation } from "@paths/shared";
import { asc, eq } from "drizzle-orm";
import type { FastifyPluginCallbackZod } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  Citation as CitationJson,
  Cutoff,
  EntityId,
  EntityKindEnum,
  EntitySummary,
  ErrorBody,
  Fact,
} from "../params.ts";
import { visibleCitations, visibleFact } from "../spoilers.ts";
import type { Store } from "../store.ts";

const EntityDetail = z.object({
  id: z.string(),
  kind: EntityKindEnum,
  name: z.string(),
  names: z.array(z.object({ name: z.string(), variants: z.array(z.string()) })),
  description: z.array(z.string()),
  revealedIn: z.number(),
  sources: z.array(CitationJson),
  born: Fact.nullable().optional(),
  died: Fact.nullable().optional(),
  start: Fact.nullable().optional(),
  end: Fact.nullable().optional(),
  seq: z.number().nullable().optional(),
  connections: z.number().describe("Relationships visible at this chapter."),
});

export const BEYOND_CUTOFF = {
  error: "beyond_cutoff",
  message: "This is beyond your current chapter.",
} as const;

export const NOT_FOUND = { error: "not_found", message: "No such entity." } as const;

export const entityRoutes: FastifyPluginCallbackZod<{ db: Db; store: Store }> = (
  app,
  { db, store },
  done,
) => {
  app.get(
    "/entities",
    {
      schema: {
        tags: ["entities"],
        summary: "List the entities a reader at this chapter knows about",
        querystring: z.object({ cutoff: Cutoff, kind: EntityKindEnum.optional() }),
        response: { 200: z.object({ items: z.array(EntitySummary) }) },
      },
    },
    // Served from memory, so no await: returning a promise is what Fastify expects.
    ({ query: { cutoff, kind } }) => {
      const items = [...store.graph.nodes.values()]
        .filter((node) => node.revealedIn <= cutoff && (kind === undefined || node.kind === kind))
        .map((node) => ({ id: node.id, kind: node.kind, name: store.nameAt(node.id, cutoff) }))
        .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
      return Promise.resolve({ items });
    },
  );

  app.get(
    "/entities/:id",
    {
      schema: {
        tags: ["entities"],
        summary: "One entity, as far as the reader knows it",
        params: z.object({ id: EntityId }),
        querystring: z.object({ cutoff: Cutoff }),
        response: { 200: EntityDetail, 404: ErrorBody },
      },
    },
    async ({ params: { id }, query: { cutoff } }, reply) => {
      const [entity] = await db.select().from(schema.entities).where(eq(schema.entities.id, id));
      if (!entity) {
        const [redirect] = await db
          .select()
          .from(schema.idRedirects)
          .where(eq(schema.idRedirects.oldId, id));
        if (redirect?.newId) {
          return reply.redirect(
            `/entities/${encodeURIComponent(redirect.newId)}?cutoff=${String(cutoff)}`,
            308,
          );
        }
        return reply.code(404).send(NOT_FOUND);
      }
      if (entity.revealedIn > cutoff) return reply.code(404).send(BEYOND_CUTOFF);

      const [nameRows, segments] = await Promise.all([
        db
          .select()
          .from(schema.entityNames)
          .where(eq(schema.entityNames.entityId, id))
          .orderBy(asc(schema.entityNames.position)),
        db
          .select()
          .from(schema.descriptionSegments)
          .where(eq(schema.descriptionSegments.entityId, id))
          .orderBy(asc(schema.descriptionSegments.position)),
      ]);

      const names = nameRows
        .filter((row) => row.isPrimary && row.revealedIn <= cutoff)
        .map((primary) => ({
          name: primary.name,
          variants: nameRows
            .filter((row) => !row.isPrimary && row.position === primary.position)
            .map((row) => row.name),
        }));

      const view = viewGraph(store.graph, { cutoff });
      const base = {
        id,
        kind: entity.kind,
        name: store.nameAt(id, cutoff),
        names,
        description: segments.filter((s) => s.revealedIn <= cutoff).map((s) => s.text),
        revealedIn: entity.revealedIn,
        sources: visibleCitations(entity.sources as Citation[], cutoff),
        connections: view.graph.adjacency.get(id)?.length ?? 0,
      };

      switch (entity.kind) {
        case "character": {
          const [detail] = await db
            .select()
            .from(schema.characters)
            .where(eq(schema.characters.entityId, id));
          return {
            ...base,
            born: visibleFact(detail?.born, cutoff) as z.infer<typeof Fact> | null,
            died: visibleFact(detail?.died, cutoff) as z.infer<typeof Fact> | null,
          };
        }
        case "event": {
          const [detail] = await db
            .select()
            .from(schema.events)
            .where(eq(schema.events.entityId, id));
          return {
            ...base,
            start: visibleFact(detail?.start, cutoff) as z.infer<typeof Fact> | null,
            end: visibleFact(detail?.end, cutoff) as z.infer<typeof Fact> | null,
            seq: detail?.seq ?? null,
          };
        }
        case "memory": {
          const [detail] = await db
            .select()
            .from(schema.memories)
            .where(eq(schema.memories.entityId, id));
          return {
            ...base,
            start: visibleFact(detail?.start, cutoff) as z.infer<typeof Fact> | null,
          };
        }
        case "titan":
        case "location":
        case "faction":
        case "arc":
          return base;
      }
    },
  );
  done();
};
