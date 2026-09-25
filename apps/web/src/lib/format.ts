import type { EntityKind, Fact } from "../api/client";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

interface Point {
  year: number;
  month?: number;
  day?: number;
}

type InUniverseDate = Point | { between: [Point, Point] };

/** In-universe years are shown as the manga counts them; years before 1 as "year −1150". */
export function formatYear(year: number): string {
  return year >= 1 ? String(year) : `year −${String(Math.abs(year))}`;
}

function formatPoint({ year, month, day }: Point): string {
  const monthName = month === undefined ? undefined : MONTHS[month - 1];
  if (monthName === undefined) return formatYear(year);
  return day === undefined
    ? `${monthName} ${formatYear(year)}`
    : `${String(day)} ${monthName} ${formatYear(year)}`;
}

export function formatDate(date: InUniverseDate): string {
  if ("between" in date) {
    const [from, to] = date.between;
    return `between ${formatPoint(from)} and ${formatPoint(to)}`;
  }
  return formatPoint(date);
}

export function formatFactDate(fact: Fact): string {
  return formatDate(fact.date as InUniverseDate);
}

/** A chapter or an inclusive range. OpenAPI 3.0 has no tuples, so ranges arrive as arrays. */
type Citation = number | readonly number[];

/** `[2, [40, 42]]` → "ch. 2, 40–42". */
export function formatCitations(citations: readonly Citation[]): string {
  if (citations.length === 0) return "";
  const parts = citations.map((c) => (typeof c === "number" ? String(c) : c.map(String).join("–")));
  return `ch. ${parts.join(", ")}`;
}

export const KIND_LABELS: Record<EntityKind, string> = {
  character: "Character",
  titan: "Titan",
  event: "Event",
  location: "Location",
  faction: "Faction",
  arc: "Arc",
  memory: "Memory",
};

/** Human labels for edge types, from the source's point of view (docs/model/relationships.md §4). */
export const EDGE_LABELS: Record<string, { forward: string; inverse: string }> = {
  parent_of: { forward: "Parent of", inverse: "Child of" },
  sibling_of: { forward: "Sibling of", inverse: "Sibling of" },
  spouse_of: { forward: "Spouse of", inverse: "Spouse of" },
  holds: { forward: "Holds", inverse: "Held by" },
  member_of: { forward: "Member of", inverse: "Has member" },
  leads: { forward: "Leads", inverse: "Led by" },
  part_of: { forward: "Part of", inverse: "Includes" },
  born_in: { forward: "Born in", inverse: "Birthplace of" },
  lives_in: { forward: "Lives in", inverse: "Home of" },
  based_at: { forward: "Based at", inverse: "Base of" },
  controls: { forward: "Controls", inverse: "Controlled by" },
  allied_with: { forward: "Allied with", inverse: "Allied with" },
  at_war_with: { forward: "At war with", inverse: "At war with" },
  participated_in: { forward: "Took part in", inverse: "Participant" },
  occurred_at: { forward: "Took place at", inverse: "Site of" },
  sub_event_of: { forward: "Part of", inverse: "Includes" },
  killed: { forward: "Killed", inverse: "Killed by" },
  caused: { forward: "Led to", inverse: "Caused by" },
  experienced: { forward: "Experienced", inverse: "Experienced by" },
  received: { forward: "Received", inverse: "Received by" },
  depicts: { forward: "Depicts", inverse: "Depicted in" },
};

export function edgeLabel(type: string, fromSource: boolean): string {
  const labels = EDGE_LABELS[type];
  if (!labels) return type;
  return fromSource ? labels.forward : labels.inverse;
}
