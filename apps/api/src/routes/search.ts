import { type Db, search } from "@paths/db";
import type { FastifyPluginCallbackZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { Cutoff, EntityKindEnum } from "../params.ts";

export const searchRoutes: FastifyPluginCallbackZod<{ db: Db }> = (app, { db }, done) => {
  app.get(
    "/search",
    {
      schema: {
        tags: ["search"],
        summary: "Find entities by name, description or connection, optionally in a year",
        description:
          "Every word must match the entity's names, a revealed description, or a connected entity's name. A standalone number (`850`) restricts to that year. Only what the reader has reached takes part in matching.",
        querystring: z.object({
          cutoff: Cutoff,
          q: z.string().trim().min(1).max(100),
          limit: z.coerce.number().int().min(1).max(50).default(10),
        }),
        response: {
          200: z.object({
            terms: z.array(z.string()).describe("The words searched for."),
            year: z.number().nullable().describe("The year searched in, if any."),
            items: z.array(
              z.object({
                id: z.string(),
                kind: EntityKindEnum,
                name: z.string(),
                reason: z.enum(["name", "description", "connection", "year"]),
                detail: z
                  .string()
                  .describe("What matched: a name, a description paragraph, or a connected name."),
                score: z.number(),
              }),
            ),
          }),
        },
      },
    },
    async ({ query: { cutoff, q, limit } }) => {
      const { terms, year, results } = await search(db, { q, cutoff, limit });
      return {
        terms,
        year,
        items: results.map((r) => ({
          id: r.id,
          kind: r.kind as z.infer<typeof EntityKindEnum>,
          name: r.displayName,
          reason: r.reason,
          detail: r.detail,
          score: r.score,
        })),
      };
    },
  );
  done();
};
