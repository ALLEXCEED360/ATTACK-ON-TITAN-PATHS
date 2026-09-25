import { type Graph, bfs, createGraph, shortestPath, viewGraph } from "@paths/graph-core";
import { EDGE_CATEGORIES, EDGE_TYPES } from "@paths/shared";
import type { FastifyPluginCallbackZod } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  At,
  Cutoff,
  EdgeCategoryEnum,
  EntityId,
  EntityKindEnum,
  ErrorBody,
  csv,
} from "../params.ts";
import type { Store } from "../store.ts";
import { BEYOND_CUTOFF, NOT_FOUND } from "./entities.ts";

const GraphNodeOut = z.object({
  id: z.string(),
  kind: EntityKindEnum,
  name: z.string(),
  uncertain: z.boolean().describe("Only possibly present at `at` (its dates are approximate)."),
});

const GraphEdgeOut = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  type: z.string(),
  category: EdgeCategoryEnum,
  uncertain: z.boolean(),
});

const NOT_PRESENT = {
  error: "not_present",
  message: "This entity doesn't exist at the chosen moment.",
} as const;

export const graphRoutes: FastifyPluginCallbackZod<{ store: Store }> = (app, { store }, done) => {
  /** The reader's view, restricted to the chosen edge categories. */
  function readerGraph(cutoff: number, at: number | undefined, categories?: string[]) {
    const view = viewGraph(store.graph, { cutoff, at });
    const allowed = new Set(categories?.length ? categories : EDGE_CATEGORIES);
    const graph: Graph = createGraph(
      view.graph.nodes.values(),
      view.graph.edges.filter((edge) => allowed.has(EDGE_TYPES[edge.type].category)),
    );
    const node = (id: string) => {
      const n = graph.nodes.get(id);
      return n
        ? {
            id,
            kind: n.kind,
            name: store.nameAt(id, cutoff),
            uncertain: view.uncertainNodes.has(id),
          }
        : undefined;
    };
    const edge = (e: Graph["edges"][number]) => ({
      id: e.id ?? `${e.source}|${e.type}|${e.target}`,
      source: e.source,
      target: e.target,
      type: e.type,
      category: EDGE_TYPES[e.type].category,
      uncertain: view.uncertainEdges.has(e),
    });
    return { graph, node, edge };
  }

  /** Why an entity is missing from the reader's graph. */
  function missing(id: string, cutoff: number) {
    const node = store.graph.nodes.get(id);
    if (!node) return NOT_FOUND;
    return node.revealedIn > cutoff ? BEYOND_CUTOFF : NOT_PRESENT;
  }

  app.get(
    "/graph/neighborhood/:id",
    {
      schema: {
        tags: ["graph"],
        summary: "Everything within a few connections of an entity",
        params: z.object({ id: EntityId }),
        querystring: z.object({
          cutoff: Cutoff,
          depth: z.coerce.number().int().min(1).max(3).default(1),
          at: At,
          categories: csv(EdgeCategoryEnum).optional(),
        }),
        response: {
          200: z.object({
            center: z.string(),
            nodes: z.array(GraphNodeOut.extend({ depth: z.number() })),
            edges: z.array(GraphEdgeOut),
          }),
          404: ErrorBody,
        },
      },
    },
    async ({ params: { id }, query: { cutoff, depth, at, categories } }, reply) => {
      const { graph, node, edge } = readerGraph(cutoff, at, categories);
      if (!graph.nodes.has(id)) return reply.code(404).send(missing(id, cutoff));

      const depths = bfs(graph, id, depth);
      const nodes = [...depths].flatMap(([nodeId, d]) => {
        const n = node(nodeId);
        return n ? [{ ...n, depth: d }] : [];
      });
      const edges = graph.edges
        .filter((e) => depths.has(e.source) && depths.has(e.target))
        .map(edge);
      return { center: id, nodes, edges };
    },
  );

  app.get(
    "/graph/path",
    {
      schema: {
        tags: ["graph"],
        summary: "The strongest chain of connections between two entities",
        querystring: z.object({
          cutoff: Cutoff,
          from: EntityId,
          to: EntityId,
          at: At,
          categories: csv(EdgeCategoryEnum).optional(),
          exclude: csv(EntityId).optional().describe("Entities the path must not pass through."),
        }),
        response: {
          200: z.object({
            path: z
              .object({
                cost: z.number(),
                nodes: z.array(GraphNodeOut),
                edges: z.array(GraphEdgeOut),
              })
              .nullable()
              .describe("null when the two aren't connected in what the reader knows."),
          }),
          404: ErrorBody,
        },
      },
    },
    async ({ query: { cutoff, from, to, at, categories, exclude } }, reply) => {
      const { graph, node, edge } = readerGraph(cutoff, at, categories);
      for (const id of [from, to]) {
        if (!graph.nodes.has(id)) return reply.code(404).send(missing(id, cutoff));
      }
      const result = shortestPath(graph, from, to, { excludeNodes: new Set(exclude ?? []) });
      if (!result) return { path: null };
      return {
        path: {
          cost: result.cost,
          nodes: result.nodes.flatMap((id) => node(id) ?? []),
          edges: result.edges.map(edge),
        },
      };
    },
  );
  done();
};
