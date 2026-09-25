import type { EntityKind, EntitySummary, SearchResults } from "../../api/client";

export type SearchItem = SearchResults["items"][number];

const KIND_ORDER: EntityKind[] = [
  "character",
  "event",
  "titan",
  "faction",
  "location",
  "memory",
  "arc",
];

/**
 * Results grouped by kind, keeping the API's ranking within each group. Groups are ordered by
 * their best result, so the strongest match is always near the top; ties follow a fixed order.
 */
export function groupResults(items: readonly SearchItem[]) {
  const groups = KIND_ORDER.flatMap((kind) => {
    const group = items.filter((item) => item.kind === kind);
    return group.length ? [{ kind, items: group }] : [];
  });
  const best = (group: (typeof groups)[number]) => Math.max(...group.items.map((i) => i.score));
  return groups.sort((a, b) => best(b) - best(a));
}

/**
 * Recent entities still visible at the reader's chapter, in recency order. `known` is the
 * spoiler-filtered entity list, so anything past the chapter simply drops out.
 */
export function visibleRecent(ids: readonly string[], known: readonly EntitySummary[]) {
  const byId = new Map(known.map((entity) => [entity.id, entity]));
  return ids.flatMap((id) => {
    const entity = byId.get(id);
    return entity ? [entity] : [];
  });
}

/** A short excerpt of `text` around the first search term, for description matches. */
export function snippet(text: string, terms: readonly string[], length = 90): string {
  if (text.length <= length) return text;
  const lower = text.toLowerCase();
  const hit =
    terms
      .map((t) => lower.indexOf(t))
      .filter((i) => i >= 0)
      .sort((a, b) => a - b)[0] ?? 0;
  const start = Math.max(0, Math.min(hit - 25, text.length - length));
  const excerpt = text.slice(start, start + length).trim();
  return `${start > 0 ? "…" : ""}${excerpt}${start + length < text.length ? "…" : ""}`;
}

/** Splits `text` into parts, marking those that match a search term (for highlighting). */
export function markTerms(text: string, terms: readonly string[]) {
  if (terms.length === 0) return [{ text, match: false }];
  const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`(${escaped.join("|")})`, "gi");
  return text
    .split(pattern)
    .filter(Boolean)
    .map((part) => ({ text: part, match: terms.includes(part.toLowerCase()) }));
}

/** One line explaining why a result matched. */
export function describeMatch(item: SearchItem, terms: readonly string[]): string | null {
  switch (item.reason) {
    case "name":
      return item.detail === item.name ? null : `Also known as “${item.detail}”`;
    case "description":
      return snippet(item.detail, terms);
    case "connection":
      return `Connected to ${item.detail}`;
    case "year":
      return `In ${item.detail}`;
  }
}
