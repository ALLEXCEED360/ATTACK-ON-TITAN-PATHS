import { Link } from "react-router";
import type { Neighborhood } from "../../api/client";
import { useNeighborhood } from "../../api/queries";
import { ErrorMessage, Loading } from "../../components/QueryState";
import { KIND_LABELS, edgeLabel } from "../../lib/format";

interface Group {
  label: string;
  items: {
    id: string;
    name: string;
    kind: Neighborhood["nodes"][number]["kind"];
    uncertain: boolean;
  }[];
}

/** Direct connections grouped by relationship, e.g. "Member of", "Took part in". */
export function groupConnections(neighborhood: Neighborhood): Group[] {
  const nodes = new Map(neighborhood.nodes.map((n) => [n.id, n]));
  const groups = new Map<string, Group>();
  for (const edge of neighborhood.edges) {
    const fromCenter = edge.source === neighborhood.center;
    if (!fromCenter && edge.target !== neighborhood.center) continue;
    const other = nodes.get(fromCenter ? edge.target : edge.source);
    if (!other) continue;
    const label = edgeLabel(edge.type, fromCenter);
    const group = groups.get(label) ?? { label, items: [] };
    if (!group.items.some((item) => item.id === other.id)) {
      group.items.push({
        id: other.id,
        name: other.name,
        kind: other.kind,
        uncertain: edge.uncertain || other.uncertain,
      });
    }
    groups.set(label, group);
  }
  return [...groups.values()].sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * A plain list of connections — the stand-in for the graph view, which arrives in Phase 5.
 */
export function ConnectionsList({ id, at }: { id: string; at?: string }) {
  const { data, error, isPending } = useNeighborhood(id, { depth: 1, at });
  if (isPending) return <Loading label="Loading connections…" />;
  if (error) return <ErrorMessage error={error} />;

  const groups = groupConnections(data);
  if (groups.length === 0) {
    return <p className="text-sm text-parchment-500">No connections revealed yet.</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      {groups.map((group) => (
        <section key={group.label} aria-label={group.label} className="flex flex-col gap-2">
          <h3 className="label">{group.label}</h3>
          <ul className="flex flex-wrap gap-2">
            {group.items.map((item) => (
              <li key={item.id}>
                <Link
                  to={`/explore/${item.id}${at ? `?at=${at}` : ""}`}
                  title={KIND_LABELS[item.kind]}
                  className={`inline-block rounded border px-2.5 py-1 text-sm hover:border-brass-500 ${
                    item.uncertain
                      ? "border-dashed border-charcoal-600 text-parchment-500"
                      : "border-charcoal-600"
                  }`}
                >
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
