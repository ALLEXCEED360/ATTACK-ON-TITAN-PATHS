import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useNeighborhood } from "../../api/queries";
import { ErrorMessage, Loading } from "../../components/QueryState";
import { ConnectionsList } from "./ConnectionsList";
import { GraphLegend } from "./GraphLegend";
import { CATEGORIES, useExploreParams } from "../explore/params";
import { PathsPanel } from "../paths/PathsPanel";
import type { NodePositions } from "./GraphView";

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
    <div role="group" aria-label={label} className="seg">
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => {
            onChange(option.value);
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function isTyping(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

/**
 * The explorer's centre pane: the graph (or its list alternative) around one entity, or PATHS
 * mode — the same entity across time. P toggles PATHS mode; Esc leaves it.
 */
export function GraphPanel({ id }: { id: string }) {
  const navigate = useNavigate();
  const { view, mode, depth, categories, at, search, setView, setMode, setDepth, toggleCategory } =
    useExploreParams();
  const readPositions = useRef<(() => NodePositions) | null>(null);
  const [origins, setOrigins] = useState<NodePositions | undefined>(undefined);
  const onPositions = useCallback((read: () => NodePositions) => {
    readPositions.current = read;
  }, []);

  const enterPaths = useCallback(() => {
    // Remember where everything sat in the graph, so it can glide into its lane.
    setOrigins(readPositions.current?.());
    setMode("paths");
  }, [setMode]);
  const leavePaths = useCallback(() => {
    setOrigins(undefined);
    setMode("explore");
  }, [setMode]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || isTyping(event.target)) return;
      if (document.querySelector("dialog[open]")) return;
      if (event.key.toLowerCase() === "p") {
        if (mode === "paths") leavePaths();
        else enterPaths();
      } else if (event.key === "Escape" && mode === "paths") {
        leavePaths();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [mode, enterPaths, leavePaths]);

  const { data, error, isPending } = useNeighborhood(
    view === "graph" && mode === "explore" ? id : undefined,
    {
      depth,
      at,
      categories,
    },
  );

  const activeCategories = categories.length ? categories : CATEGORIES.map((c) => c.value);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-pressed={mode === "paths"}
          aria-keyshortcuts="P"
          title="PATHS mode: this entity across time (P)"
          onClick={mode === "paths" ? leavePaths : enterPaths}
          className={`notch flex items-center gap-2 px-3.5 py-1.5 font-mono text-[0.7rem] font-bold tracking-[0.24em] transition-all ${
            mode === "paths"
              ? "bg-brass-400 text-ink shadow-[0_0_24px_rgb(207_168_85/0.45)]"
              : "bg-charcoal-800 text-brass-300 hover:bg-brass-500 hover:text-ink"
          }`}
        >
          <span aria-hidden="true" className="rotate-45 text-[0.55rem]">
            ■
          </span>
          PATHS
        </button>
        <Segmented
          label="View"
          value={view}
          options={[
            { value: "graph", label: "Graph" },
            { value: "list", label: "List" },
          ]}
          onChange={setView}
        />
        {view === "graph" && mode === "explore" && (
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
                  className="chip"
                >
                  {category.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {mode === "paths" ? (
        <PathsPanel id={id} origins={origins} />
      ) : view === "list" ? (
        <ConnectionsList id={id} at={at} />
      ) : isPending ? (
        <Loading label="Loading graph…" variant="panel" />
      ) : error ? (
        <ErrorMessage error={error} />
      ) : (
        <>
          <Suspense fallback={<Loading label="Loading graph…" variant="panel" />}>
            <GraphView
              neighborhood={data}
              onPositions={onPositions}
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
