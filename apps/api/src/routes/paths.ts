import { type Interval, pathsView, viewGraph } from "@paths/graph-core";
import type { FastifyPluginCallbackZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { Cutoff, EntityId, EntityKindEnum, ErrorBody } from "../params.ts";
import type { Store } from "../store.ts";
import { BEYOND_CUTOFF, NOT_FOUND } from "./entities.ts";

const Range = z.object({ earliest: z.number(), latest: z.number() });
const Span = z
  .object({ start: Range.nullable(), end: Range.nullable() })
  .describe("Bounds are encoded dates (year × 10000 + month × 100 + day); null is unknown/open.");

const PathsBody = z.object({
  center: z.string(),
  supported: z.boolean().describe("False for places and groups, which PATHS mode doesn't follow."),
  lanes: z.array(
    z.object({
      id: z.string(),
      kind: EntityKindEnum,
      name: z.string(),
      span: Span,
      segments: z.array(z.object({ holder: z.string(), holderName: z.string(), span: Span })),
    }),
  ),
  hiddenLanes: z.number(),
  events: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      span: Span,
      seq: z.number().nullable(),
      lanes: z.array(z.string()),
    }),
  ),
  causal: z.array(z.object({ from: z.string(), to: z.string() })),
  memories: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      date: Range.nullable(),
      experiencedBy: z.string().nullable(),
      received: z.array(z.object({ by: z.string(), span: Span })),
      depicts: z.string().nullable(),
    }),
  ),
});

const span = (interval: Interval) => ({ start: interval.start, end: interval.end });

export const pathsRoutes: FastifyPluginCallbackZod<{ store: Store }> = (app, { store }, done) => {
  app.get(
    "/paths/:id",
    {
      schema: {
        tags: ["graph"],
        summary: "PATHS mode: how an entity connects across time",
        description:
          "Titan lineages, lifetimes, events, memories (including memories received before they happened) and causes, laid out as lanes (docs/features/paths-mode.md). Computed on the reader's spoiler-filtered graph.",
        params: z.object({ id: EntityId }),
        querystring: z.object({ cutoff: Cutoff }),
        response: { 200: PathsBody, 404: ErrorBody },
      },
    },
    async ({ params: { id }, query: { cutoff } }, reply) => {
      const node = store.graph.nodes.get(id);
      if (!node) return reply.code(404).send(NOT_FOUND);
      if (node.revealedIn > cutoff) return reply.code(404).send(BEYOND_CUTOFF);

      const view = pathsView(viewGraph(store.graph, { cutoff }).graph, id);
      const name = (entity: string) => store.nameAt(entity, cutoff);
      return {
        center: view.center,
        supported: view.supported,
        lanes: view.lanes.map((lane) => ({
          id: lane.id,
          kind: lane.kind,
          name: name(lane.id),
          span: span(lane.span),
          segments: lane.segments.map((s) => ({
            holder: s.holder,
            holderName: name(s.holder),
            span: span(s.span),
          })),
        })),
        hiddenLanes: view.hiddenLanes,
        events: view.events.map((e) => ({
          id: e.id,
          name: name(e.id),
          span: span(e.span),
          seq: e.seq ?? null,
          lanes: e.lanes,
        })),
        causal: view.causal,
        memories: view.memories.map((m) => ({
          id: m.id,
          name: name(m.id),
          date: m.date,
          experiencedBy: m.experiencedBy,
          received: m.received.map((r) => ({ by: r.by, span: span(r.span) })),
          depicts: m.depicts,
        })),
      };
    },
  );
  done();
};
