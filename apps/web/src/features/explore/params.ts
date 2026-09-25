import { useSearchParams } from "react-router";

// The explorer's state, kept in the URL so any view can be shared (docs/decisions/0006):
// the moment in time, the view, the graph depth and the relationship categories.
// (The spoiler cutoff is deliberately *not* here.)

export const CATEGORIES = [
  { value: "structural", label: "Family & membership" },
  { value: "event", label: "Events" },
  { value: "causal", label: "Cause & effect" },
  { value: "paths", label: "Memories" },
] as const;

export type Category = (typeof CATEGORIES)[number]["value"];

/**
 * The categories after toggling one. An empty list means "no filter" (everything shown), so
 * switching everything on — or the last one off — returns to it.
 */
export function nextCategories(current: readonly Category[], category: Category): Category[] {
  const active = current.length ? current : CATEGORIES.map((c) => c.value);
  const next = active.includes(category)
    ? active.filter((c) => c !== category)
    : [...active, category];
  return next.length === CATEGORIES.length ? [] : next;
}

export function useExploreParams() {
  const [params, setParams] = useSearchParams();
  const view: "graph" | "list" = params.get("view") === "list" ? "list" : "graph";
  const mode: "explore" | "paths" = params.get("mode") === "paths" ? "paths" : "explore";
  const depth = Math.min(3, Math.max(1, Number(params.get("depth") ?? 1) || 1));
  const known = new Set<string>(CATEGORIES.map((c) => c.value));
  const categories = (params.get("categories") ?? "")
    .split(",")
    .filter((c): c is Category => known.has(c));

  const update = (changes: Record<string, string | null>) => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        for (const [key, value] of Object.entries(changes)) {
          if (value === null) next.delete(key);
          else next.set(key, value);
        }
        return next;
      },
      { replace: true },
    );
  };

  return {
    view,
    /** "paths" shows PATHS mode, the time-lane view (docs/features/paths-mode.md). */
    mode,
    depth,
    categories,
    /** A moment in world time (`YYYY-MM`), or undefined for "all of time". */
    at: params.get("at") ?? undefined,
    /** The current query string, for links that should keep the explorer's settings. */
    search: params.toString() ? `?${params.toString()}` : "",
    setAt: (at: string | null) => {
      update({ at });
    },
    setMode: (m: "explore" | "paths") => {
      update({ mode: m === "paths" ? m : null });
    },
    setView: (v: "graph" | "list") => {
      update({ view: v === "graph" ? null : v });
    },
    setDepth: (d: number) => {
      update({ depth: d === 1 ? null : String(d) });
    },
    toggleCategory: (category: Category) => {
      const next = nextCategories(categories, category);
      update({ categories: next.length ? next.join(",") : null });
    },
  };
}
