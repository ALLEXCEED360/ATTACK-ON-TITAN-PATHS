import { findDirectedCycle } from "@paths/graph-core";
import {
  type DateRange,
  EDGE_TYPES,
  type EdgeType,
  LAST_CHAPTER,
  resolveDate,
  yearOfBound,
} from "@paths/shared";
import type { Issue } from "./issues.ts";
import type { Dataset, LoadedEdge } from "./load.ts";
import { REFERENCE_FILES } from "./load.ts";
import {
  activeInterval,
  resolveDateRef,
  timeRefEntries,
  timeRefsOf,
  toGraphInput,
} from "./resolve.ts";

/**
 * Cross-file rules from the design docs: references, edge kinds, reveal order, cycles, Titan
 * holders, event ordering and reference-data coverage. Schema rules run earlier, in `loadDataset`.
 */
export function validateDataset(dataset: Dataset): Issue[] {
  return [
    ...checkRedirects(dataset),
    ...checkEdges(dataset),
    ...checkCycles(dataset),
    ...checkTitanHolders(dataset),
    ...checkEventOrder(dataset),
    ...checkChapterCoverage(dataset.volumes, "volume", REFERENCE_FILES.volumes, (v) =>
      String(v.volume),
    ),
    ...checkChapterCoverage(dataset.arcs, "arc", REFERENCE_FILES.arcs, (a) => a.id),
    ...checkEras(dataset),
    ...toGraphInput(dataset).issues,
  ];
}

function edgeIssue(loaded: LoadedEdge, message: string, field?: string): Issue {
  const path = `edges[${String(loaded.index)}]${field ? `.${field}` : ""}`;
  return { level: "error", file: loaded.file, path, message };
}

function checkRedirects({ entities, redirects }: Dataset): Issue[] {
  const issues: Issue[] = [];
  for (const [retired, replacement] of Object.entries(redirects)) {
    const error = (message: string) =>
      issues.push({ level: "error", file: REFERENCE_FILES.redirects, path: retired, message });
    if (entities.has(retired)) error("a retired ID can't also be a live entity");
    if (replacement !== null && !entities.has(replacement)) {
      error(`redirect target \`${replacement}\` isn't a live entity (redirects can't chain)`);
    }
  }
  return issues;
}

function checkEdges(dataset: Dataset): Issue[] {
  const { entities, redirects } = dataset;
  const issues: Issue[] = [];
  const seen = new Set<string>();

  const requireEntity = (loaded: LoadedEdge, id: string, field: string, kind?: string) => {
    const target = entities.get(id)?.entity;
    if (target === undefined) {
      const replacement = redirects[id];
      issues.push(
        edgeIssue(
          loaded,
          replacement === undefined
            ? `unknown entity \`${id}\``
            : `\`${id}\` was retired${replacement ? ` — use \`${replacement}\`` : ""}`,
          field,
        ),
      );
      return undefined;
    }
    if (kind !== undefined && target.kind !== kind) {
      issues.push(edgeIssue(loaded, `\`${id}\` must be a ${kind}`, field));
      return undefined;
    }
    if (target.revealedIn > loaded.edge.revealedIn) {
      issues.push(
        edgeIssue(
          loaded,
          `revealed in ch. ${String(loaded.edge.revealedIn)}, before \`${id}\` (ch. ${String(target.revealedIn)})`,
          "revealedIn",
        ),
      );
    }
    return target;
  };

  for (const loaded of dataset.edges) {
    const { edge } = loaded;
    const definition = EDGE_TYPES[edge.type];
    const source = entities.get(edge.source)?.entity;
    if (source === undefined) continue;

    if (!(definition.source as readonly string[]).includes(source.kind)) {
      issues.push(
        edgeIssue(loaded, `a ${source.kind} can't be the source of \`${edge.type}\``, "type"),
      );
    }
    if (edge.source === edge.target) {
      issues.push(edgeIssue(loaded, "an edge can't connect an entity to itself", "target"));
    }

    const target = requireEntity(loaded, edge.target, "target");
    if (target) {
      if (!(definition.target as readonly string[]).includes(target.kind)) {
        issues.push(
          edgeIssue(loaded, `\`${edge.type}\` can't point to a ${target.kind}`, "target"),
        );
      }
      if ("sameKind" in definition && target.kind !== source.kind) {
        issues.push(
          edgeIssue(
            loaded,
            `\`${edge.type}\` must connect two entities of the same kind`,
            "target",
          ),
        );
      }
    }

    // References inside attributes and dates.
    if (edge.type === "participated_in" && edge.side)
      requireEntity(loaded, edge.side, "side", "faction");
    if (edge.type === "killed" && edge.in) requireEntity(loaded, edge.in, "in", "event");
    for (const [field, ref] of timeRefEntries(edge)) {
      if ("event" in ref) requireEntity(loaded, ref.event, `${field}.event`, "event");
    }

    // One edge per (source, type, target, from); symmetric types stored in one direction only.
    const from = JSON.stringify(timeRefsOf(edge).from ?? null);
    const key = `${edge.source}|${edge.type}|${edge.target}|${from}`;
    if (seen.has(key))
      issues.push(edgeIssue(loaded, "duplicate edge (same source, type, target and `from`)"));
    seen.add(key);
    if (definition.symmetric && seen.has(`${edge.target}|${edge.type}|${edge.source}|${from}`)) {
      issues.push(
        edgeIssue(
          loaded,
          `\`${edge.type}\` is symmetric — it's already stored from the other side`,
        ),
      );
    }
  }
  return issues;
}

const ACYCLIC_TYPES: readonly EdgeType[] = ["parent_of", "sub_event_of", "caused"];

function checkCycles(dataset: Dataset): Issue[] {
  return ACYCLIC_TYPES.flatMap((type) => {
    const cycle = findDirectedCycle(
      dataset.edges.filter(({ edge }) => edge.type === type).map(({ edge }) => edge),
    );
    return cycle
      ? [{ level: "error" as const, message: `\`${type}\` cycle: ${cycle.join(" → ")}` }]
      : [];
  });
}

function checkTitanHolders(dataset: Dataset): Issue[] {
  const issues: Issue[] = [];
  const byTitan = new Map<string, LoadedEdge[]>();
  for (const loaded of dataset.edges) {
    if (loaded.edge.type !== "holds") continue;
    const list = byTitan.get(loaded.edge.target);
    if (list) list.push(loaded);
    else byTitan.set(loaded.edge.target, [loaded]);
  }

  for (const [titan, holdings] of byTitan) {
    const periods = holdings.map((loaded) => ({ loaded, ...activeInterval(dataset, loaded) }));
    periods.forEach((a, i) => {
      for (const b of periods.slice(i + 1)) {
        // Only flag overlaps that are certain, whatever the uncertainty in the dates.
        const lastStart = Math.max(a.start?.latest ?? -Infinity, b.start?.latest ?? -Infinity);
        const firstEnd = Math.min(a.end?.earliest ?? Infinity, b.end?.earliest ?? Infinity);
        if (lastStart < firstEnd) {
          issues.push(
            edgeIssue(
              b.loaded,
              `\`${titan}\` would have two holders at once (\`${a.loaded.edge.source}\` and \`${b.loaded.edge.source}\`) — give the holdings \`until\` dates or death dates`,
            ),
          );
        }
      }
    });
  }
  return issues;
}

function checkEventOrder({ entities }: Dataset): Issue[] {
  const groups = new Map<string, { id: string; file: string; seq: number | undefined }[]>();
  for (const { entity, file } of entities.values()) {
    if (entity.kind !== "event") continue;
    const range = resolveDate(entity.start.date);
    const key = `${String(range.earliest)}:${String(range.latest)}`;
    const group = groups.get(key) ?? [];
    group.push({ id: entity.id, file, seq: entity.seq });
    groups.set(key, group);
  }

  const issues: Issue[] = [];
  for (const group of groups.values()) {
    const bySeq = new Map<number | undefined, string[]>();
    for (const event of group) bySeq.set(event.seq, [...(bySeq.get(event.seq) ?? []), event.id]);
    for (const [seq, ids] of bySeq) {
      if (ids.length < 2) continue;
      issues.push({
        level: "warning",
        message: `events with the same start date ${seq === undefined ? "and no `seq`" : `share seq ${String(seq)}`} can't be ordered: ${ids.join(", ")}`,
      });
    }
  }
  return issues;
}

function checkChapterCoverage<T extends { chapters: [number, number] }>(
  items: readonly T[] | null,
  label: string,
  file: string,
  name: (item: T) => string,
): Issue[] {
  if (items === null) {
    return [{ level: "warning", file, message: `not written yet — no ${label}s defined` }];
  }
  const issues: Issue[] = [];
  let expected = 1;
  for (const item of items) {
    const [from, to] = item.chapters;
    if (from !== expected) {
      issues.push({
        level: "error",
        file,
        message: `${label} ${name(item)} starts at ch. ${String(from)}, expected ch. ${String(expected)} (${label}s must be in order, with no gaps or overlaps)`,
      });
    }
    expected = to + 1;
  }
  if (expected !== LAST_CHAPTER + 1) {
    issues.push({
      level: "error",
      file,
      message: `${label}s must cover chapters 1–${String(LAST_CHAPTER)}`,
    });
  }
  return issues;
}

function checkEras(dataset: Dataset): Issue[] {
  const file = REFERENCE_FILES.eras;
  const { eras } = dataset;
  if (eras === null)
    return [{ level: "warning", file, message: "not written yet — no eras defined" }];

  const issues: Issue[] = [];
  eras.forEach((era, index) => {
    const previous = eras[index - 1];
    if (previous && era.startYear !== previous.endYear + 1) {
      issues.push({
        level: "error",
        file,
        path: era.key,
        message: `must start the year after \`${previous.key}\` ends (${String(previous.endYear + 1)})`,
      });
    }
  });

  const first = eras[0];
  const last = eras[eras.length - 1];
  if (!first || !last)
    return [...issues, { level: "error", file, message: "define at least one era" }];

  const outside = (range: DateRange | null | undefined) =>
    range != null &&
    (yearOfBound(range.earliest) < first.startYear || yearOfBound(range.latest) > last.endYear);
  for (const { entity, file: entityFile } of dataset.entities.values()) {
    const dates =
      entity.kind === "character"
        ? [entity.born, entity.died]
        : entity.kind === "event"
          ? [entity.start, entity.end]
          : entity.kind === "memory"
            ? [entity.start]
            : [];
    if (dates.some((fact) => fact && outside(resolveDate(fact.date)))) {
      issues.push({ level: "error", file: entityFile, message: "has a date outside every era" });
    }
  }
  for (const loaded of dataset.edges) {
    for (const [field, ref] of timeRefEntries(loaded.edge)) {
      // Event references are covered by the event's own dates.
      if (!("event" in ref) && outside(resolveDateRef(dataset, ref))) {
        issues.push(edgeIssue(loaded, "date outside every era", field));
      }
    }
  }
  return issues;
}
