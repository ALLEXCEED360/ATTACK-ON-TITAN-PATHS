// Usage: node apps/api/src/server.ts — env: DATABASE_URL, PORT (3000), HOST, CORS_ORIGIN.
import { connect } from "@paths/db";
import { buildApp } from "./app.ts";
import { loadStore } from "./store.ts";

const { db, close } = connect();
const store = await loadStore(db);
const app = await buildApp({
  db,
  store,
  corsOrigin: process.env.CORS_ORIGIN?.split(",") ?? "*",
  logger: { level: process.env.LOG_LEVEL ?? "info" },
  // Outside production, never cache: a reseed should show up on the next request.
  ...(process.env.NODE_ENV === "production" ? {} : { cacheControl: "no-store" }),
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void app.close().then(close);
  });
}

await app.listen({
  port: Number(process.env.PORT ?? 3000),
  host: process.env.HOST ?? "0.0.0.0",
});
