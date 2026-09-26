import { useState } from "react";
import { useNavigate } from "react-router";
import { usePaths } from "../../api/queries";
import { ErrorMessage, Loading } from "../../components/QueryState";
import { useExploreParams } from "../explore/params";
import { PathsList } from "./PathsList";
import { type Layer, PathsView } from "./PathsView";

const LAYERS: { value: Layer; label: string; color: string }[] = [
  { value: "inheritance", label: "Inheritance", color: "var(--color-brass-500)" },
  { value: "memories", label: "Memories", color: "var(--color-military-400)" },
  { value: "causality", label: "Cause & effect", color: "var(--color-blood-400)" },
];

/** PATHS mode's content: the lane diagram (or its text version) plus layer toggles. */
export function PathsPanel({
  id,
  origins,
}: {
  id: string;
  origins?: ReadonlyMap<string, { x: number; y: number }> | undefined;
}) {
  const navigate = useNavigate();
  const { view, at, search } = useExploreParams();
  const { data, error, isPending } = usePaths(id);
  const [layers, setLayers] = useState<ReadonlySet<Layer>>(new Set(LAYERS.map((l) => l.value)));

  if (isPending) return <Loading label="Tracing PATHS…" variant="panel" />;
  if (error) return <ErrorMessage error={error} />;
  if (!data.supported) {
    return (
      <p className="frame p-6 text-sm text-parchment-300">
        PATHS mode follows characters, Titans, events and memories through time. Choose one of those
        to trace.
      </p>
    );
  }
  if (data.lanes.length === 0 && data.events.length === 0) {
    return (
      <p className="frame p-6 text-sm text-parchment-300">
        Nothing to trace across time yet at your chapter.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div role="group" aria-label="Layers" className="flex flex-wrap items-center gap-1">
        {LAYERS.map((layer) => (
          <button
            key={layer.value}
            type="button"
            aria-pressed={layers.has(layer.value)}
            onClick={() => {
              const next = new Set(layers);
              if (next.has(layer.value)) next.delete(layer.value);
              else next.add(layer.value);
              setLayers(next);
            }}
            className="chip"
          >
            <span
              aria-hidden
              className="inline-block h-0.5 w-3"
              style={{ backgroundColor: layer.color }}
            />
            {layer.label}
          </button>
        ))}
        {data.hiddenLanes > 0 && (
          <span className="ml-2 text-xs text-parchment-500">
            +{data.hiddenLanes} more {data.hiddenLanes === 1 ? "person" : "people"} not shown
          </span>
        )}
      </div>

      {view === "list" ? (
        <PathsList data={data} search={search} />
      ) : (
        <>
          <PathsView
            data={data}
            at={at}
            layers={layers}
            origins={origins}
            onSelect={(next) => {
              if (next !== id) void navigate(`/explore/${next}${search}`);
            }}
          />
          <p className="text-xs text-parchment-500">
            Time runs left to right; quiet years are folded into ⋯. Faded ends mean a date isn’t
            known. Gold dashed arcs below the lanes are memories received before they happened.
          </p>
        </>
      )}
    </div>
  );
}
