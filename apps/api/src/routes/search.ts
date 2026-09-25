import { type Db, searchNames } from "@paths/db";
import type { FastifyPluginCallbackZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { Cutoff, EntityKindEnum } from "../params.ts";

export const searchRoutes: FastifyPluginCallbackZod<{ db: Db }> = (app, { db }, done) => {
  app.get(
    "/search",
    {
      schema: {
        tags: ["search"],
        summary: "Find entities by any name or spelling the reader knows",
        querystring: z.object({
          cutoff: Cutoff,
          q: z.string().trim().min(1).max(100),
          limit: z.coerce.number().int().min(1).max(50).default(10),
        }),
        response: {
          200: z.object({
            items: z.array(
              z.object({
                id: z.string(),
                kind: EntityKindEnum,
                name: z.string(),
                matched: z.string().describe("The name or spelling that matched."),
                score: z.number(),
              }),
            ),
          }),
        },
      },
    },
    async ({ query: { cutoff, q, limit } }) => {
      const results = await searchNames(db, { q, cutoff, limit });
      return {
        items: results.map((r) => ({
          id: r.id,
          kind: r.kind as z.infer<typeof EntityKindEnum>,
          name: r.displayName,
          matched: r.matched,
          score: r.score,
        })),
      };
    },
  );
  done();
};
