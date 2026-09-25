import createClient from "openapi-fetch";
import type { components, paths } from "./schema";

// Typed client generated from the API's OpenAPI document (`pnpm api:types`), so a change to the
// API that breaks the web app fails the type check.

export const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:3000";

export const api = createClient<paths>({ baseUrl: API_URL });

/** An error response from the API, e.g. `beyond_cutoff` for an entity the reader hasn't reached. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, body: unknown) {
    const { error, message } = (body ?? {}) as { error?: string; message?: string };
    super(message ?? `Request failed (${String(status)})`);
    this.status = status;
    this.code = error ?? "unknown";
  }
}

/** Unwraps an openapi-fetch result, throwing ApiError for error responses. */
export async function unwrap<T>(
  request: Promise<{ data?: T; error?: unknown; response: Response }>,
): Promise<T> {
  const { data, error, response } = await request;
  if (error !== undefined || data === undefined) throw new ApiError(response.status, error);
  return data;
}

type Json<P extends keyof paths> = paths[P]["get"]["responses"][200]["content"]["application/json"];

export type EntityList = Json<"/entities">;
export type EntitySummary = EntityList["items"][number];
export type EntityDetail = Json<"/entities/{id}">;
export type Neighborhood = Json<"/graph/neighborhood/{id}">;
export type PathResult = Json<"/graph/path">;
export type Paths = Json<"/paths/{id}">;
export type Timeline = Json<"/timeline">;
export type SearchResults = Json<"/search">;
export type EntityKind = EntitySummary["kind"];
export type Fact = NonNullable<EntityDetail["born"]>;
export type { components };
