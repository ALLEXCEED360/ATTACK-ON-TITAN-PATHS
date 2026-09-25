import { useEffect, useId, useRef, useState } from "react";
import { useTimeline } from "../../api/queries";
import { formatAtParam, formatMonth, monthRange, parseAt } from "./time";

interface TimeSliderProps {
  at: string | undefined;
  onChange: (at: string | null) => void;
}

/**
 * Scrub through world time (docs/model/dates.md §8): the graph shows only what exists at that
 * moment. The label follows the thumb instantly; the URL (and so the graph) follows once the
 * thumb pauses, so dragging doesn't fire a request per month.
 */
export function TimeSlider({ at, onChange }: TimeSliderProps) {
  const { data } = useTimeline("world");
  const range = data ? monthRange(data.items) : null;
  const committed = parseAt(at);
  const [live, setLive] = useState<number | null>(committed);
  const timer = useRef<number | undefined>(undefined);
  const id = useId();

  // Follow outside changes (e.g. back/forward navigation), adjusting state during render as
  // React recommends, rather than in an effect.
  const [seen, setSeen] = useState(committed);
  if (committed !== seen) {
    setSeen(committed);
    setLive(committed);
  }

  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
    },
    [],
  );

  if (!range) return null;
  const active = live !== null;
  const value = live ?? range.max;

  const change = (next: number) => {
    setLive(next);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      onChange(formatAtParam(next));
    }, 200);
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-charcoal-700 bg-charcoal-900 px-3 py-2">
      <label htmlFor={id} className="label shrink-0">
        Moment
      </label>
      <input
        id={id}
        type="range"
        min={range.min}
        max={range.max}
        value={value}
        aria-valuetext={active ? formatMonth(value) : "All of time"}
        onChange={(event) => {
          change(event.target.valueAsNumber);
        }}
        className={`min-w-40 flex-1 accent-brass-500 ${active ? "" : "opacity-50"}`}
      />
      <output htmlFor={id} className="w-20 shrink-0 font-mono text-sm text-parchment-100">
        {active ? formatMonth(value) : "All time"}
      </output>
      <button
        type="button"
        disabled={!active}
        onClick={() => {
          window.clearTimeout(timer.current);
          setLive(null);
          onChange(null);
        }}
        className="rounded border border-charcoal-600 px-2 py-0.5 text-xs text-parchment-300 enabled:hover:border-brass-500 disabled:opacity-40"
      >
        Show all time
      </button>
    </div>
  );
}
