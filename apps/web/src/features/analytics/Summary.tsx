import { Link } from "react-router";
import type { Analytics } from "../../api/client";
import { formatYear } from "../../lib/format";
import { ChartCard, DataTable } from "./ChartCard";

/** The headline counts: a row of stat tiles rather than a chart. */
export function StatTiles({ totals }: { totals: Analytics["totals"] }) {
  const tiles = [
    { label: "Characters", value: totals.characters },
    { label: "Events", value: totals.events },
    { label: "Relationships", value: totals.relationships },
    { label: "Known deaths", value: totals.deaths },
  ];
  return (
    <section aria-label="Totals" className="flex flex-col gap-2">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="frame flex flex-col-reverse gap-1 px-5 py-4">
            <dt className="label">{tile.label}</dt>
            <dd className="display text-6xl text-parchment-50 tabular-nums">{tile.value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-sm text-parchment-500">
        Also {totals.locations} {totals.locations === 1 ? "place" : "places"}, {totals.factions}{" "}
        {totals.factions === 1 ? "faction" : "factions"} and {totals.titans}{" "}
        {totals.titans === 1 ? "Titan" : "Titans"}.
      </p>
    </section>
  );
}

/** Each Titan and who is known to have held it, in order where dates allow. */
export function TitanHolders({ titans }: { titans: Analytics["titans"] }) {
  return (
    <ChartCard
      title="Titan holders"
      caption="Who holds each Titan, as far as you know."
      chart={
        titans.length === 0 ? (
          <p className="text-sm text-parchment-500">No Titans revealed yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-charcoal-800">
            {titans.map((titan) => (
              <li
                key={titan.id}
                className="flex flex-wrap items-baseline justify-between gap-2 py-3"
              >
                <Link to={`/entity/${titan.id}`} className="font-medium hover:text-brass-300">
                  {titan.name}
                </Link>
                {titan.holders.length === 0 ? (
                  <span className="text-sm text-parchment-500">No holder known yet</span>
                ) : (
                  <ol className="flex flex-wrap items-baseline gap-x-2 text-sm text-parchment-300">
                    {titan.holders.map((holder, i) => (
                      <li key={holder.id} className="flex items-baseline gap-2">
                        {i > 0 && (
                          <span aria-hidden="true" className="text-parchment-500">
                            →
                          </span>
                        )}
                        <Link to={`/entity/${holder.id}`} className="hover:text-brass-300">
                          {holder.name}
                        </Link>
                        {holder.start && (
                          <span className="font-mono text-xs text-parchment-500">
                            from {formatYear(Math.floor(holder.start.earliest / 10_000))}
                          </span>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
              </li>
            ))}
          </ul>
        )
      }
    />
  );
}

/** Degree and betweenness for the most connected characters — explicitly not a ranking. */
export function MetricsTable({ connections }: { connections: Analytics["connections"] }) {
  return (
    <ChartCard
      title="Graph metrics"
      caption={
        <>
          These measure the graph, not importance. <b className="font-medium">Connections</b> counts
          relationships you've read about; <b className="font-medium">bridging</b> counts how often
          someone sits on the shortest link between two others.
        </>
      }
      chart={
        connections.length === 0 ? (
          <p className="text-sm text-parchment-500">No characters yet.</p>
        ) : (
          <DataTable
            columns={[
              { label: "Character" },
              { label: "Connections", numeric: true },
              { label: "Bridging", numeric: true },
            ]}
            rows={connections.map((c) => ({
              key: c.id,
              cells: [
                <Link key="name" to={`/entity/${c.id}`} className="hover:text-brass-300">
                  {c.name}
                </Link>,
                c.degree,
                c.betweenness.toFixed(1),
              ],
            }))}
          />
        )
      }
    />
  );
}
