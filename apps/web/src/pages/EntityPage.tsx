import { useRememberRecent } from "../features/search/useRememberRecent";
import { Link, useParams } from "react-router";
import { EntityDetails } from "../features/entity/EntityDetails";
import { ConnectionsList } from "../features/graph/ConnectionsList";

export function EntityPage() {
  const { id = "" } = useParams();
  useRememberRecent(id);
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10">
      <EntityDetails id={id} />
      <section aria-labelledby="connections" className="flex flex-col gap-4">
        <h2 id="connections" className="text-xl font-semibold">
          Connections
        </h2>
        <ConnectionsList id={id} />
        <Link to={`/explore/${id}`} className="text-sm text-brass-300 hover:underline">
          Explore connections →
        </Link>
      </section>
    </div>
  );
}
