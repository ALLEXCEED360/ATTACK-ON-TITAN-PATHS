import type { DateRange } from "@paths/shared";
import { betweennessCentrality, degreeCentrality } from "./centrality.ts";
import { type Graph, type GraphEdge, type GraphNode, type Interval, neighborsOf } from "./graph.ts";
import { intersect } from "./view.ts";

// Analytics over a reader's view (docs/decisions/0009-analytics.md). Pure, and fed only a graph
// already filtered to the reader's chapter (`viewGraph`), so every number reflects what the
// reader knows — including what they *don't* yet know about deaths and dates.
// These are graph metrics, not rankings of importance.

export interface Analytics {
  totals: {
    characters: number;
    events: number;
    locations: number;
    factions: number;
    titans: number;
    relationships: number;
    /** Characters whose death the reader knows of. */
    deaths: number;
  };
  /** Every year from the first to the last dated event (empty years included). */
  years: number[];
  eventsPerYear: { year: number; events: string[] }[];
  /** The most connected characters and how their connections change year by year. */
  connections: { id: string; degree: number; betweenness: number; perYear: number[] }[];
  /** Factions and how many events members of each pair took part in together. */
  factions: string[];
  factionMatrix: number[][];
  /** Each Titan's known holders, in order of holding where dates are known. */
  titans: { id: string; holders: { id: string; start: DateRange | null }[] }[];
}

export const TOP_CONNECTED = 8;

/** Whether an interval overlaps a year at all (unknown bounds are open). */
function overlapsYear(interval: Interval, year: number): boolean {
  const from = year * 10_000 + 101;
  const to = year * 10_000 + 1231;
  return (
    (interval.start === null || interval.start.earliest <= to) &&
    (interval.end === null || interval.end.latest >= from)
  );
}

/** Whether two intervals share any moment (unknown bounds are open). */
function overlaps(a: Interval, b: Interval): boolean {
  return (
    (a.start === null || b.end === null || a.start.earliest <= b.end.latest) &&
    (a.end === null || b.start === null || a.end.latest >= b.start.earliest)
  );
}

/**
 * Negative when event `a` comes before event `b` in the story's own order, positive after, 0 for
 * the same event; undefined when their dates can't tell (docs/model/dates.md §4: events in the
 * same period are ordered by `seq`).
 */
function storyOrder(view: Graph, a: string, b: string): number | undefined {
  if (a === b) return 0;
  const first = view.nodes.get(a);
  const second = view.nodes.get(b);
  const x = first?.lifetime.start;
  const y = second?.lifetime.start;
  if (!x || !y) return undefined;
  if (x.latest < y.earliest) return -1;
  if (x.earliest > y.latest) return 1;
  const same = x.earliest === y.earliest && x.latest === y.latest;
  if (same && first.seq !== undefined && second.seq !== undefined) return first.seq - second.seq;
  return undefined;
}

interface Membership {
  id: string;
  active: Interval;
  anchors?: GraphEdge["anchors"];
}

export function analytics(view: Graph, top = TOP_CONNECTED): Analytics {
  const nodes = [...view.nodes.values()];
  const ofKind = (kind: string) => nodes.filter((n) => n.kind === kind);
  const events = ofKind("event");
  const characters = ofKind("character");

  const eventYear = (id: string) => {
    const start = view.nodes.get(id)?.lifetime.start;
    return start ? Math.floor(start.earliest / 10_000) : null;
  };
  // In the order they happened: (earliest, seq, id), as in docs/model/dates.md §4.
  const dated = events
    .flatMap((e) => {
      const year = eventYear(e.id);
      const earliest = e.lifetime.start?.earliest;
      return year === null || earliest === undefined
        ? []
        : [{ id: e.id, year, earliest, seq: e.seq }];
    })
    .sort(
      (a, b) =>
        a.earliest - b.earliest ||
        (a.seq ?? Infinity) - (b.seq ?? Infinity) ||
        a.id.localeCompare(b.id),
    );
  const first = Math.min(...dated.map((d) => d.year));
  const last = Math.max(...dated.map((d) => d.year));
  const years = dated.length ? Array.from({ length: last - first + 1 }, (_, i) => first + i) : [];

  const degree = degreeCentrality(view);
  const betweenness = betweennessCentrality(view);
  const connected = characters
    .map((c) => c.id)
    .sort((a, b) => (degree.get(b) ?? 0) - (degree.get(a) ?? 0) || a.localeCompare(b))
    .slice(0, top);

  const perYear = (id: string) =>
    years.map((year) => {
      const self = view.nodes.get(id);
      if (!self || !overlapsYear(self.lifetime, year)) return 0;
      return neighborsOf(view, id).filter(({ edge }) => {
        const source = view.nodes.get(edge.source);
        const target = view.nodes.get(edge.target);
        if (!source || !target) return false;
        const active = intersect(edge.own, source.lifetime, target.lifetime);
        return overlapsYear(active, year);
      }).length;
    });

  // Faction co-participation: events in which members of both factions took part — counting a
  // member only while they belonged (someone who joins later doesn't bring their past with them).
  const factions = ofKind("faction")
    .map((f) => f.id)
    .sort();
  const membersOf = new Map<string, Membership[]>(
    factions.map((f) => [f, [{ id: f, active: { start: null, end: null } }]]),
  );
  for (const edge of view.edges) {
    if (edge.type !== "member_of" && edge.type !== "leads") continue;
    const member = view.nodes.get(edge.source);
    if (!member) continue;
    membersOf.get(edge.target)?.push({
      id: edge.source,
      active: intersect(edge.own, member.lifetime),
      ...(edge.anchors ? { anchors: edge.anchors } : {}),
    });
  }
  // Whether a membership held at an event: by date, then — when both dates are the same
  // year-or-so — by the story order of the events it's anchored to.
  const heldAt = (m: Membership, event: GraphNode) => {
    if (!overlaps(m.active, event.lifetime)) return false;
    const { from, until } = m.anchors ?? {};
    const sinceStart = from && storyOrder(view, event.id, from.event);
    if (sinceStart !== undefined && (from?.at === "end" ? sinceStart <= 0 : sinceStart < 0))
      return false;
    const untilEnd = until && storyOrder(view, event.id, until.event);
    return untilEnd === undefined || untilEnd <= 0;
  };
  const participants = new Map<string, Set<string>>();
  for (const edge of view.edges) {
    if (edge.type !== "participated_in") continue;
    const set = participants.get(edge.target) ?? new Set<string>();
    set.add(edge.source);
    participants.set(edge.target, set);
  }
  const takesPart = (faction: string, event: GraphNode) => {
    const present = participants.get(event.id) ?? new Set<string>();
    return (membersOf.get(faction) ?? []).some((m) => present.has(m.id) && heldAt(m, event));
  };
  const factionMatrix = factions.map((a) =>
    factions.map((b) => events.filter((e) => takesPart(a, e) && takesPart(b, e)).length),
  );

  const titans = ofKind("titan")
    .map((titan) => ({
      id: titan.id,
      holders: view.edges
        .filter((e) => e.type === "holds" && e.target === titan.id)
        .map((e) => {
          const holder = view.nodes.get(e.source);
          const start = holder ? intersect(e.own, holder.lifetime).start : null;
          return { id: e.source, start };
        })
        .sort(
          (a, b) =>
            (a.start?.earliest ?? Infinity) - (b.start?.earliest ?? Infinity) ||
            a.id.localeCompare(b.id),
        ),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  return {
    totals: {
      characters: characters.length,
      events: events.length,
      locations: ofKind("location").length,
      factions: factions.length,
      titans: titans.length,
      relationships: view.edges.length,
      deaths: characters.filter((c) => c.lifetime.end !== null).length,
    },
    years,
    eventsPerYear: years.map((year) => ({
      year,
      events: dated.filter((d) => d.year === year).map((d) => d.id),
    })),
    connections: connected.map((id) => ({
      id,
      degree: degree.get(id) ?? 0,
      betweenness: Math.round((betweenness.get(id) ?? 0) * 10) / 10,
      perYear: perYear(id),
    })),
    factions,
    factionMatrix,
    titans,
  };
}
