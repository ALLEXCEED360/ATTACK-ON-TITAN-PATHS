import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useCutoff } from "../stores/reader";
import { api, unwrap } from "./client";

// Server state. Every key includes the reader's cutoff: the same URL means different data at
// different chapters, so cached answers must never cross chapters.

export function useEntities() {
  const cutoff = useCutoff();
  return useQuery({
    queryKey: ["entities", cutoff],
    queryFn: () => unwrap(api.GET("/entities", { params: { query: { cutoff } } })),
  });
}

export function useEntity(id: string) {
  const cutoff = useCutoff();
  return useQuery({
    queryKey: ["entity", id, cutoff],
    queryFn: () =>
      unwrap(api.GET("/entities/{id}", { params: { path: { id }, query: { cutoff } } })),
    retry: false,
  });
}

export function useNeighborhood(
  id: string | undefined,
  options: { depth?: number; at?: string; categories?: readonly string[] },
) {
  const cutoff = useCutoff();
  const { depth = 1, at, categories } = options;
  const categoryParam = categories?.length ? [...categories].sort().join(",") : undefined;
  return useQuery({
    queryKey: ["neighborhood", id, cutoff, depth, at, categoryParam],
    queryFn: () =>
      unwrap(
        api.GET("/graph/neighborhood/{id}", {
          params: {
            path: { id: id ?? "" },
            query: {
              cutoff,
              depth,
              ...(at ? { at } : {}),
              ...(categoryParam ? { categories: categoryParam } : {}),
            },
          },
        }),
      ),
    enabled: id !== undefined,
    placeholderData: keepPreviousData,
    retry: false,
  });
}

export function useTimeline(order: "world" | "story") {
  const cutoff = useCutoff();
  return useQuery({
    queryKey: ["timeline", cutoff, order],
    queryFn: () => unwrap(api.GET("/timeline", { params: { query: { cutoff, order } } })),
  });
}

export function useSearch(q: string) {
  const cutoff = useCutoff();
  const query = q.trim();
  return useQuery({
    queryKey: ["search", cutoff, query],
    queryFn: () =>
      unwrap(api.GET("/search", { params: { query: { cutoff, q: query, limit: 8 } } })),
    enabled: query.length > 0,
    placeholderData: keepPreviousData,
  });
}
