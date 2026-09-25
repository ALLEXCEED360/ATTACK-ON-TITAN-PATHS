import { Link } from "react-router";
import type { EntityDetail, Fact } from "../../api/client";
import { useEntity } from "../../api/queries";
import { ErrorMessage, Loading } from "../../components/QueryState";
import { KIND_LABELS, formatCitations, formatFactDate } from "../../lib/format";

function FactRow({ label, fact }: { label: string; fact: Fact | null | undefined }) {
  if (!fact) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="label">{label}</dt>
      <dd>
        {formatFactDate(fact)}
        {fact.certainty === "inferred" && (
          <span className="ml-2 text-xs text-parchment-500" title={fact.notes}>
            (inferred)
          </span>
        )}
        <span className="ml-2 font-mono text-xs text-parchment-500">
          {formatCitations(fact.sources)}
        </span>
      </dd>
    </div>
  );
}

export function EntityBody({ entity, compact }: { entity: EntityDetail; compact?: boolean }) {
  const otherNames = entity.names
    .flatMap((n) => [n.name, ...n.variants])
    .filter((n) => n !== entity.name);
  const Heading = compact ? "h2" : "h1";

  return (
    <article className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <p className="label">{KIND_LABELS[entity.kind]}</p>
        <Heading className={compact ? "text-2xl font-semibold" : "text-4xl font-semibold"}>
          {entity.name}
        </Heading>
        {otherNames.length > 0 && (
          <p className="text-sm text-parchment-500">Also known as {otherNames.join(", ")}</p>
        )}
      </header>

      {entity.description.length > 0 && (
        <div className="flex flex-col gap-3 text-parchment-300">
          {entity.description.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      )}

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FactRow label="Born" fact={entity.born} />
        <FactRow label="Died" fact={entity.died} />
        <FactRow label="Began" fact={entity.start} />
        <FactRow label="Ended" fact={entity.end} />
        <div className="flex flex-col gap-0.5">
          <dt className="label">First appears</dt>
          <dd className="font-mono text-sm">ch. {entity.revealedIn}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="label">Connections</dt>
          <dd className="font-mono text-sm">{entity.connections}</dd>
        </div>
      </dl>

      <p className="font-mono text-xs text-parchment-500">
        Sources: {formatCitations(entity.sources)}
      </p>
    </article>
  );
}

/** An entity as far as the reader knows it. */
export function EntityDetails({ id, compact }: { id: string; compact?: boolean }) {
  const { data, error, isPending } = useEntity(id);
  if (isPending) return <Loading />;
  if (error) return <ErrorMessage error={error} />;
  return (
    <div className="flex flex-col gap-4">
      <EntityBody entity={data} compact={compact} />
      {compact && (
        <Link to={`/entity/${id}`} className="text-sm text-brass-300 hover:underline">
          Open full page →
        </Link>
      )}
    </div>
  );
}
