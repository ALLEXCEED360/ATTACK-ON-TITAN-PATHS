import { useAnalytics } from "../api/queries";
import { ErrorMessage, Loading } from "../components/QueryState";
import { ConnectionsChart } from "../features/analytics/ConnectionsChart";
import { EventsChart } from "../features/analytics/EventsChart";
import { FactionHeatmap } from "../features/analytics/FactionHeatmap";
import { MetricsTable, StatTiles, TitanHolders } from "../features/analytics/Summary";
import { useCutoff } from "../stores/reader";
import { PageHeader } from "../components/PageHeader";

export function AnalyticsPage() {
  const cutoff = useCutoff();
  const { data, error, isPending } = useAnalytics();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader label="Analytics" title="The story in numbers" kanji="分析">
        <p className="prose-story">
          Counted from what you&apos;ve read — up to chapter {cutoff}. Nothing past it is included.
        </p>
      </PageHeader>

      {isPending ? (
        <Loading label="Counting…" />
      ) : error ? (
        <ErrorMessage error={error} />
      ) : (
        <>
          <StatTiles totals={data.totals} />
          <div className="grid gap-6 lg:grid-cols-2">
            <ConnectionsChart years={data.years} series={data.connections} />
            <EventsChart data={data.eventsPerYear} />
            <FactionHeatmap factions={data.factions} matrix={data.factionMatrix} />
            <TitanHolders titans={data.titans} />
            <MetricsTable connections={data.connections} />
          </div>
        </>
      )}
    </div>
  );
}
