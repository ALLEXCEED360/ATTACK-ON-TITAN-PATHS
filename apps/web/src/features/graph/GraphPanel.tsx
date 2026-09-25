import { useNavigate } from "react-router";
import { useNeighborhood } from "../../api/queries";
import { ErrorMessage, Loading } from "../../components/QueryState";
import { ConnectionsList } from "./ConnectionsList";
import { GraphLegend } from "./GraphLegend";
import { lazy, Suspense } from "react";
import { CATEGORIES, useExploreParams } from "../explore/params";

// Cytoscape is large: load it only when the graph is shown, not on every page.
const GraphView = lazy(() => import("./GraphView").then((m) => ({ default: m.GraphView })));

function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded border border-charcoal-600">
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => {
            onChange(option.value);
          }}
          className={`px-2.5 py-1 text-xs ${
            value === option.value
              ? "bg-charcoal-700 text-parchment-100"
              : "text-parchment-500 hover:text-parchment-300"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** The explorer's centre pane: the graph (or its list alternative) around one entity. */
export function GraphPanel({ id }: { id: string }) {
  const navigate = useNavigate();
  const { view, depth, categories, at, search, setView, setDepth, toggleCategory } =
    useExploreParams();
  const { data, error, isPending } = useNeighborhood(view === "graph" ? id : undefined, {
    depth,
    at,
    categories,
  });

  const activeCategories = categories.length ? categories : CATEGORIES.map((c) => c.value);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          label="View"
          value={view}
          options={[
            { value: "graph", label: "Graph" },
            { value: "list", label: "List" },
          ]}
          onChange={setView}
        />
        {view === "graph" && (
          <>
            <Segmented
              label="Depth"
              value={depth}
              options={[
                { value: 1, label: "1 step" },
                { value: 2, label: "2 steps" },
                { value: 3, label: "3 steps" },
              ]}
              onChange={setDepth}
            />
            <div role="group" aria-label="Relationship types" className="flex flex-wrap gap-1">
              {CATEGORIES.map((category) => (
                <button
                  key={category.value}
                  type="button"
                  aria-pressed={activeCategories.includes(category.value)}
                  onClick={() => {
                    toggleCategory(category.value);
                  }}
                  className={`rounded-full border px-2.5 py-0.5 text-xs ${
                    activeCategories.includes(category.value)
                      ? "border-brass-500 text-parchment-100"
                      : "border-charcoal-600 text-parchment-500 line-through"
                  }`}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {view === "list" ? (
        <ConnectionsList id={id} at={at} />
      ) : isPending ? (
        <Loading label="Loading graph…" />
      ) : error ? (
        <ErrorMessage error={error} />
      ) : (
        <>
          <Suspense fallback={<Loading label="Loading graph…" />}>
            <GraphView
              neighborhood={data}
              onSelect={(next) => {
                if (next !== id) void navigate(`/explore/${next}${search}`);
              }}
            />
          </Suspense>
          <GraphLegend />
        </>
      )}
    </div>
  );
}
