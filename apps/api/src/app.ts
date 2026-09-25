import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import type { Db } from "@paths/db";
import { sql } from "drizzle-orm";
import Fastify, { type FastifyServerOptions } from "fastify";
import {
  type ZodTypeProvider,
  hasZodFastifySchemaValidationErrors,
  isResponseSerializationError,
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import { z } from "zod";
import { analyticsRoutes } from "./routes/analytics.ts";
import { entityRoutes } from "./routes/entities.ts";
import { graphRoutes } from "./routes/graph.ts";
import { pathsRoutes } from "./routes/paths.ts";
import { searchRoutes } from "./routes/search.ts";
import { timelineRoutes } from "./routes/timeline.ts";
import type { Store } from "./store.ts";

export interface AppOptions {
  db: Db;
  store: Store;
  /** Allowed browser origin(s) for CORS. */
  corsOrigin?: string | string[];
  logger?: FastifyServerOptions["logger"];
  /** Cache-Control for data responses. Defaults to a short public cache (production). */
  cacheControl?: string;
}

/** Data only changes on deploy, so responses can be cached briefly by browsers and CDNs. */
const CACHE_CONTROL = "public, max-age=300";

export async function buildApp({
  db,
  store,
  corsOrigin = "*",
  logger = false,
  cacheControl = CACHE_CONTROL,
}: AppOptions) {
  const app = Fastify({ logger }).withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(cors, { origin: corsOrigin, methods: ["GET"] });
  await app.register(swagger, {
    openapi: {
      info: {
        title: "Attack on Titan: PATHS API",
        version: "0.1.0",
        description:
          "Read-only, spoiler-aware access to the PATHS knowledge graph. Every data endpoint takes `cutoff`, the last chapter the reader has read; nothing revealed after it is ever returned.",
      },
    },
    transform: jsonSchemaTransform,
  });
  await app.register(swaggerUi, { routePrefix: "/docs" });

  app.setErrorHandler((error, request, reply) => {
    if (hasZodFastifySchemaValidationErrors(error)) {
      return reply.code(400).send({ error: "bad_request", message: error.message });
    }
    // A response that doesn't match its schema is never sent: failing closed can't leak data.
    if (isResponseSerializationError(error)) request.log.error(error, "response failed its schema");
    else request.log.error(error);
    return reply.code(500).send({ error: "internal", message: "Something went wrong." });
  });
  app.setNotFoundHandler((_request, reply) =>
    reply.code(404).send({ error: "not_found", message: "No such route." }),
  );

  app.addHook("onSend", async (request, reply) => {
    if (request.method === "GET" && reply.statusCode === 200 && !request.url.startsWith("/docs")) {
      reply.header("cache-control", request.url.startsWith("/health") ? "no-store" : cacheControl);
    }
  });

  app.get(
    "/health",
    {
      schema: {
        tags: ["meta"],
        summary: "Whether the API and its database are up",
        response: { 200: z.object({ status: z.literal("ok") }) },
      },
    },
    async () => {
      await db.execute(sql`select 1`);
      return { status: "ok" as const };
    },
  );

  await app.register(entityRoutes, { db, store });
  await app.register(graphRoutes, { store });
  await app.register(pathsRoutes, { store });
  await app.register(timelineRoutes, { db, store });
  await app.register(searchRoutes, { db });
  await app.register(analyticsRoutes, { store });
  return app;
}
