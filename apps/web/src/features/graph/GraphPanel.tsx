import { useNavigate, useSearchParams } from "react-router";
import { useNeighborhood } from "../../api/queries";
import { ErrorMessage, Loading } from "../../components/QueryState";
import { ConnectionsList } from "./ConnectionsList";
import { GraphLegend } from "./GraphLegend";
import { lazy, Suspense } from "react";

// Cytoscape is large: load it only when the graph is shown, not on every page.
const GraphView = lazy(() => import("./GraphView").then((m) => ({ default: m.GraphView })));

export const CATEGORIES = [
  { value: "structural", label: "Family & membership" },
  { value: "event", label: "Events" },
  { value: "causal", label: "Cause & effect" },
  { value: "paths", label: "Memories" },
] as const;

export type Category = (typeof CATEGORIES)[number]["value"];

/**
 * The categories after toggling one. An empty list means "no filter" (everything shown), so
 * switching everything on — or the last one off — returns to it.
 */
export function nextCategories(current: readonly Category[], category: Category): Category[] {
  const active = current.length ? current : CATEGORIES.map((c) => c.value);
  const next = active.includes(category)
    ? active.filter((c) => c !== category)
    : [...active, category];
  return next.length === CATEGORIES.length ? [] : next;
}

/** Graph controls, all kept in the URL so a view can be shared: view, depth, categories. */
export function useGraphParams() {
  const [params, setParams] = useSearchParams();
  const view: "graph" | "list" = params.get("view") === "list" ? "list" : "graph";
  const depth = Math.min(3, Math.max(1, Number(params.get("depth") ?? 1) || 1));
  const known = new Set<string>(CATEGORIES.map((c) => c.value));
  const categories = (params.get("categories") ?? "")
    .split(",")
    .filter((c): c is Category => known.has(c));

  const update = (changes: Record<string, string | null>) => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        for (const [key, value] of Object.entries(changes)) {
          if (value === null) next.delete(key);
          else next.set(key, value);
        }
        return next;
      },
      { replace: true },
    );
  };

  return {
    view,
    depth,
    categories,
    at: params.get("at") ?? undefined,
    setView: (v: "graph" | "list") => {
      update({ view: v === "graph" ? null : v });
    },
    setDepth: (d: number) => {
      update({ depth: d === 1 ? null : String(d) });
    },
    toggleCategory: (category: Category) => {
      const next = nextCategories(categories, category);
      update({ categories: next.length ? next.join(",") : null });
    },
  };
}

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
  const { view, depth, categories, at, setView, setDepth, toggleCategory } = useGraphParams();
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
                if (next !== id) void navigate(`/explore/${next}${window.location.search}`);
              }}
            />
          </Suspense>
          <GraphLegend />
        </>
      )}
    </div>
  );
}
