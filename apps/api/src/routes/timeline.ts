import { type Db, schema } from "@paths/db";
import { resolveDate } from "@paths/shared";
import { eq, lte } from "drizzle-orm";
import type { FastifyPluginCallbackZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { Cutoff, Fact } from "../params.ts";
import { visibleFact } from "../spoilers.ts";
import type { Store } from "../store.ts";

const TimelineItem = z.object({
  id: z.string(),
  name: z.string(),
  revealedIn: z.number().describe("The chapter where the reader learns of this event."),
  start: Fact.nullable(),
  end: Fact.nullable(),
  seq: z.number().nullable(),
});

export const timelineRoutes: FastifyPluginCallbackZod<{ db: Db; store: Store }> = (
  app,
  { db, store },
  done,
) => {
  app.get(
    "/timeline",
    {
      schema: {
        tags: ["timeline"],
        summary: "Events the reader knows about, in world or story order",
        description:
          "`world` orders events by when they happened (docs/model/dates.md §4); `story` orders them by the chapter that reveals them (docs/model/spoilers.md §8). Events whose date isn't revealed yet come last in world order.",
        querystring: z.object({
          cutoff: Cutoff,
          order: z.enum(["world", "story"]).default("world"),
        }),
        response: {
          200: z.object({ order: z.enum(["world", "story"]), items: z.array(TimelineItem) }),
        },
      },
    },
    async ({ query: { cutoff, order } }) => {
      const rows = await db
        .select({
          id: schema.entities.id,
          revealedIn: schema.entities.revealedIn,
          start: schema.events.start,
          end: schema.events.end,
          seq: schema.events.seq,
        })
        .from(schema.events)
        .innerJoin(schema.entities, eq(schema.entities.id, schema.events.entityId))
        .where(lte(schema.entities.revealedIn, cutoff));

      const items = rows.map((row) => {
        const start = visibleFact(row.start, cutoff) as z.infer<typeof Fact> | null;
        return {
          item: {
            id: row.id,
            name: store.nameAt(row.id, cutoff),
            revealedIn: row.revealedIn,
            start,
            end: visibleFact(row.end, cutoff) as z.infer<typeof Fact> | null,
            seq: row.seq,
          },
          earliest: start ? resolveDate(start.date).earliest : Infinity,
        };
      });

      const world = (a: (typeof items)[number], b: (typeof items)[number]) =>
        a.earliest - b.earliest ||
        (a.item.seq ?? Infinity) - (b.item.seq ?? Infinity) ||
        a.item.id.localeCompare(b.item.id);
      items.sort(
        order === "world" ? world : (a, b) => a.item.revealedIn - b.item.revealedIn || world(a, b),
      );
      return { order, items: items.map(({ item }) => item) };
    },
  );
  done();
};
