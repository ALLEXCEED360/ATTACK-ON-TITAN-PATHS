const SHAPES = {
  character: <circle cx="7" cy="7" r="6" />,
  event: <polygon points="7,1 13,7 7,13 1,7" />,
  titan: <polygon points="4,1.5 10,1.5 13,7 10,12.5 4,12.5 1,7" />,
  location: <rect x="1.5" y="2.5" width="11" height="9" rx="2" />,
  faction: <polygon points="4.5,1 9.5,1 13,4.5 13,9.5 9.5,13 4.5,13 1,9.5 1,4.5" />,
};

const KINDS = [
  { kind: "character", label: "Character", color: "var(--color-parchment-300)" },
  { kind: "event", label: "Event", color: "var(--color-military-400)" },
  { kind: "titan", label: "Titan", color: "var(--color-blood-400)" },
  { kind: "location", label: "Location", color: "var(--color-parchment-500)" },
  { kind: "faction", label: "Faction", color: "var(--color-military-600)" },
] as const;

const EDGES = [
  { label: "Family & membership", color: "var(--color-parchment-500)" },
  { label: "Events", color: "var(--color-military-600)" },
  { label: "Cause & effect", color: "var(--color-blood-400)" },
  { label: "Memories", color: "var(--color-brass-500)" },
] as const;

/** Key to the graph's shapes and line colours. */
export function GraphLegend() {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-parchment-500">
      {KINDS.map(({ kind, label, color }) => (
        <span key={kind} className="inline-flex items-center gap-1.5">
          <svg aria-hidden width="14" height="14" viewBox="0 0 14 14" fill={color}>
            {SHAPES[kind]}
          </svg>
          {label}
        </span>
      ))}
      {EDGES.map(({ label, color }) => (
        <span key={label} className="inline-flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-0.5 w-4" style={{ backgroundColor: color }} />
          {label}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5">
        <span
          aria-hidden
          className="inline-block w-4 border-t border-dashed border-parchment-500"
        />
        Uncertain dates
      </span>
    </div>
  );
}
