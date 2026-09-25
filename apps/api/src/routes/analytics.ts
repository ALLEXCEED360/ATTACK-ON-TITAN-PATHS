import { analytics, viewGraph } from "@paths/graph-core";
import type { FastifyPluginCallbackZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { Cutoff } from "../params.ts";
import type { Store } from "../store.ts";

const Named = z.object({ id: z.string(), name: z.string() });

const AnalyticsBody = z.object({
  totals: z.object({
    characters: z.number(),
    events: z.number(),
    locations: z.number(),
    factions: z.number(),
    titans: z.number(),
    relationships: z.number(),
    deaths: z.number().describe("Characters whose death the reader knows of."),
  }),
  years: z.array(z.number()),
  eventsPerYear: z.array(z.object({ year: z.number(), events: z.array(Named) })),
  connections: z.array(
    Named.extend({
      degree: z.number().describe("Relationships the reader knows of."),
      betweenness: z
        .number()
        .describe("How often this entity lies on the shortest link between two others."),
      perYear: z.array(z.number()).describe("Relationships active in each of `years`."),
    }),
  ),
  factions: z.array(Named),
  factionMatrix: z
    .array(z.array(z.number()))
    .describe("Events in which members of both factions took part (row × column)."),
  titans: z.array(
    Named.extend({
      holders: z.array(
        Named.extend({ start: z.object({ earliest: z.number(), latest: z.number() }).nullable() }),
      ),
    }),
  ),
});

export const analyticsRoutes: FastifyPluginCallbackZod<{ store: Store }> = (
  app,
  { store },
  done,
) => {
  app.get(
    "/analytics",
    {
      schema: {
        tags: ["analytics"],
        summary: "Graph metrics over what the reader knows",
        description:
          "Totals, events per year, connections over time, faction co-participation and Titan holders — all computed on the reader's spoiler-filtered graph. These are graph metrics, not rankings of importance.",
        querystring: z.object({ cutoff: Cutoff }),
        response: { 200: AnalyticsBody },
      },
    },
    // Served from memory, so no await: returning a promise is what Fastify expects.
    ({ query: { cutoff } }) => {
      const result = analytics(viewGraph(store.graph, { cutoff }).graph);
      const named = (id: string) => ({ id, name: store.nameAt(id, cutoff) });
      return Promise.resolve({
        totals: result.totals,
        years: result.years,
        eventsPerYear: result.eventsPerYear.map((y) => ({
          year: y.year,
          events: y.events.map(named),
        })),
        connections: result.connections.map((c) => ({ ...c, ...named(c.id) })),
        factions: result.factions.map(named),
        factionMatrix: result.factionMatrix,
        titans: result.titans.map((t) => ({
          ...named(t.id),
          holders: t.holders.map((h) => ({ ...named(h.id), start: h.start })),
        })),
      });
    },
  );
  done();
};
