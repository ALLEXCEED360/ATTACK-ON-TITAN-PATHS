import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { Paths } from "../../api/client";
import { KIND_LABELS, formatYear } from "../../lib/format";
import { parseAt } from "../timeline/time";
import { theBefore } from "./PathsList";
import { type TimeScale, buildTimeScale, spreadEvents } from "./scale";

// The time-lane diagram (docs/features/paths-mode.md §3). World time runs left to right; each
// Titan and person has a lane. Titan lanes are split by holder, events sit on the lanes of
// those who took part, causes are red arrows, and memories arc between lanes — backwards arcs
// (a memory received before it happened) curve below the lanes in gold.

export type Layer = "inheritance" | "memories" | "causality";

type Span = Paths["lanes"][number]["span"];
interface Point {
  x: number;
  y: number;
}

const LABEL_WIDTH = 176;
const LANE_HEIGHT = 58;
const AXIS_HEIGHT = 36;
const PADDING_RIGHT = 24;
const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Years with something dated in them: they get room on the axis. */
export function contentYears(data: Paths): number[] {
  const years: number[] = [];
  const add = (bound: number | undefined) => {
    if (bound !== undefined) years.push(Math.floor(bound / 10_000));
  };
  const addSpan = (span: Span) => {
    add(span.start?.earliest);
    add(span.start?.latest);
    add(span.end?.earliest);
    add(span.end?.latest);
  };
  data.lanes.forEach((lane) => {
    addSpan(lane.span);
    lane.segments.forEach((s) => {
      addSpan(s.span);
    });
  });
  data.events.forEach((e) => {
    addSpan(e.span);
  });
  data.memories.forEach((m) => {
    add(m.date?.earliest);
    m.received.forEach((r) => {
      add(r.span.start?.earliest);
    });
  });
  return years;
}

/** A bar from a span's start to its end; unknown sides run to the edge and fade out. */
function SpanBar({
  span,
  scale,
  y,
  height,
  color,
  label,
}: {
  span: Span;
  scale: TimeScale;
  y: number;
  height: number;
  color: string;
  label?: string;
}) {
  const gradient = useId();
  const x1 = span.start ? scale.x(span.start.earliest) : scale.left;
  const x2 = span.end ? scale.x(span.end.latest) : scale.right;
  const width = Math.max(x2 - x1, 3);
  const fadeIn = span.start === null;
  const fadeOut = span.end === null;
  // Dashed ends mark uncertain bounds (a date known only to a range).
  const fuzzyStart = span.start ? scale.x(span.start.latest) - x1 : 0;
  const fuzzyEnd = span.end ? x2 - scale.x(span.end.earliest) : 0;

  return (
    <g>
      <defs>
        <linearGradient id={gradient}>
          <stop offset="0" stopColor={color} stopOpacity={fadeIn ? 0 : 1} />
          <stop offset={fadeIn ? "0.25" : "0"} stopColor={color} stopOpacity={1} />
          <stop offset={fadeOut ? "0.75" : "1"} stopColor={color} stopOpacity={1} />
          <stop offset="1" stopColor={color} stopOpacity={fadeOut ? 0 : 1} />
        </linearGradient>
      </defs>
      <rect
        x={x1}
        y={y - height / 2}
        width={width}
        height={height}
        rx={height / 2}
        fill={`url(#${gradient})`}
      />
      {fuzzyStart > 1 && (
        <rect
          x={x1}
          y={y - height / 2}
          width={fuzzyStart}
          height={height}
          fill="var(--color-charcoal-900)"
          opacity={0.55}
        />
      )}
      {fuzzyEnd > 1 && (
        <rect
          x={x2 - fuzzyEnd}
          y={y - height / 2}
          width={fuzzyEnd}
          height={height}
          fill="var(--color-charcoal-900)"
          opacity={0.55}
        />
      )}
      {label && width > 40 && (
        <text
          x={x1 + width / 2}
          y={y + 4}
          textAnchor="middle"
          fontSize={11}
          fill="var(--color-charcoal-950)"
          fontWeight={600}
        >
          {label}
        </text>
      )}
    </g>
  );
}

interface PathsViewProps {
  data: Paths;
  at?: string | undefined;
  layers: ReadonlySet<Layer>;
  /** Where entities sat in the graph, so they can glide into their lanes (§5). */
  origins?: ReadonlyMap<string, Point> | undefined;
  onSelect: (id: string) => void;
}

export function PathsView({ data, at, layers, origins, onSelect }: PathsViewProps) {
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(900);
  const [settled, setSettled] = useState(!origins || prefersReducedMotion());
  const arrow = useId();

  useLayoutEffect(() => {
    const element = container.current;
    if (!element) return;
    setWidth(Math.max(480, element.clientWidth));
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.max(480, entry.contentRect.width));
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);

  // Start where the graph left things, then glide into place on the next frame.
  useEffect(() => {
    if (settled) return;
    const frame = requestAnimationFrame(() => {
      setSettled(true);
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [settled]);

  const scale = buildTimeScale(contentYears(data), LABEL_WIDTH, width - PADDING_RIGHT);
  const laneY = new Map(
    data.lanes.map((lane, i) => [lane.id, AXIS_HEIGHT + i * LANE_HEIGHT + LANE_HEIGHT / 2]),
  );
  const orphanRow = AXIS_HEIGHT + data.lanes.length * LANE_HEIGHT + LANE_HEIGHT / 2;
  const hasOrphans = data.events.some((e) => e.lanes.length === 0);
  const height = AXIS_HEIGHT + (data.lanes.length + (hasOrphans ? 1 : 0)) * LANE_HEIGHT + 16;

  const eventX = spreadEvents(
    data.events.map((e) => ({
      id: e.id,
      start: e.span.start?.earliest ?? null,
      end: e.span.end?.latest ?? null,
      seq: e.seq,
    })),
    scale,
  );
  const eventPoints = (id: string): Point[] => {
    const event = data.events.find((e) => e.id === id);
    const x = eventX.get(id);
    if (!event || x === undefined) return [];
    const rows = event.lanes.length
      ? event.lanes.map((l) => laneY.get(l) ?? orphanRow)
      : [orphanRow];
    // Topmost first: cause arrows and labels attach there.
    return rows.sort((a, b) => a - b).map((y) => ({ x, y }));
  };

  const moment = parseAt(at);
  const momentBound =
    moment === null ? null : Math.floor(moment / 12) * 10_000 + ((moment % 12) + 1) * 100 + 1;
  const later = (bound: number | undefined) =>
    momentBound !== null && bound !== undefined && bound > momentBound;

  const glide = (id: string, final: Point) => {
    const origin = origins?.get(id);
    if (settled || !origin) {
      return {
        transform: "translate(0px, 0px)",
        opacity: 1,
        transition: `transform 600ms ${EASE}, opacity 400ms ease-out`,
      };
    }
    return {
      transform: `translate(${String(origin.x - final.x)}px, ${String(origin.y - final.y)}px)`,
      opacity: 1,
      transition: "none",
    };
  };
  const fade = { opacity: settled ? 1 : 0, transition: "opacity 500ms ease-out 150ms" };

  const activate = (id: string) => ({
    role: "link",
    tabIndex: 0,
    // A class, not `style`: elements that glide already carry their own style.
    className: "cursor-pointer",
    onClick: () => {
      onSelect(id);
    },
    onKeyDown: (event: React.KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onSelect(id);
      }
    },
  });

  return (
    <div
      ref={container}
      className="w-full overflow-x-auto rounded-lg border border-charcoal-700 bg-charcoal-900"
    >
      <svg
        width={width}
        height={height}
        role="group"
        aria-label={`PATHS: ${String(data.lanes.length)} lanes across time. Switch to the list view for a text version.`}
        className="block select-none"
      >
        <defs>
          <marker
            id={arrow}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" fill="var(--color-blood-400)" />
          </marker>
        </defs>

        {/* Axis: one band per year shown; collapsed stretches marked with ⋯ */}
        <g style={fade}>
          {scale.ticks.map((tick, i) => (
            <g key={tick.year}>
              <rect
                x={tick.x}
                y={AXIS_HEIGHT}
                width={tick.width}
                height={height - AXIS_HEIGHT - 16}
                fill={i % 2 ? "var(--color-charcoal-800)" : "transparent"}
                opacity={0.5}
              />
              <text
                x={tick.x + tick.width / 2}
                y={22}
                textAnchor="middle"
                fontSize={13}
                fontFamily="var(--font-mono)"
                fontWeight={600}
                fill="var(--color-brass-300)"
              >
                {formatYear(tick.year)}
              </text>
            </g>
          ))}
          {scale.gaps.map((gap) => (
            <text
              key={gap.x}
              x={gap.x + gap.width / 2}
              y={22}
              textAnchor="middle"
              fontSize={12}
              fill="var(--color-parchment-500)"
            >
              ⋯<title>{`${String(gap.years)} years with nothing on this view`}</title>
            </text>
          ))}
        </g>

        {/* Lanes */}
        {data.lanes.map((lane) => {
          const y = laneY.get(lane.id) ?? 0;
          const isCenter = lane.id === data.center;
          return (
            <g key={lane.id}>
              <line
                x1={0}
                x2={width}
                y1={y + LANE_HEIGHT / 2}
                y2={y + LANE_HEIGHT / 2}
                stroke="var(--color-charcoal-700)"
              />
              <g
                style={glide(lane.id, { x: 16, y })}
                {...activate(lane.id)}
                aria-label={`${lane.name}, ${KIND_LABELS[lane.kind]}`}
              >
                <text
                  x={16}
                  y={y - 2}
                  fontSize={13}
                  fontWeight={isCenter ? 700 : 500}
                  fill={isCenter ? "var(--color-brass-300)" : "var(--color-parchment-100)"}
                >
                  {lane.name.length > 22 ? `${lane.name.slice(0, 21)}…` : lane.name}
                </text>
                <text
                  x={16}
                  y={y + 13}
                  fontSize={10}
                  fontFamily="var(--font-mono)"
                  fill="var(--color-parchment-500)"
                  letterSpacing="0.08em"
                >
                  {KIND_LABELS[lane.kind].toUpperCase()}
                </text>
              </g>
              <g style={fade}>
                {lane.kind === "titan" ? (
                  layers.has("inheritance") &&
                  lane.segments.map((segment, i) => (
                    <g
                      key={segment.holder}
                      {...activate(segment.holder)}
                      opacity={later(segment.span.start?.earliest) ? 0.35 : 1}
                    >
                      <title>{`${segment.holderName} holds ${theBefore(lane.name)}${lane.name}`}</title>
                      <SpanBar
                        span={segment.span}
                        scale={scale}
                        y={y}
                        height={20}
                        color={i % 2 ? "var(--color-brass-300)" : "var(--color-brass-500)"}
                        label={segment.holderName}
                      />
                    </g>
                  ))
                ) : (
                  <g opacity={later(lane.span.start?.earliest) ? 0.35 : 1}>
                    <title>{`${lane.name}'s lifetime${lane.span.start || lane.span.end ? "" : " (dates not known)"}`}</title>
                    <SpanBar
                      span={lane.span}
                      scale={scale}
                      y={y}
                      height={4}
                      color="var(--color-parchment-500)"
                    />
                  </g>
                )}
              </g>
            </g>
          );
        })}
        {hasOrphans && (
          <text
            x={16}
            y={orphanRow + 4}
            fontSize={11}
            fontFamily="var(--font-mono)"
            fill="var(--color-parchment-500)"
            style={fade}
          >
            OTHER EVENTS
          </text>
        )}

        {/* Causes: red arrows between events */}
        {layers.has("causality") &&
          data.causal.map(({ from, to }) => {
            const [a] = eventPoints(from);
            const [b] = eventPoints(to);
            if (!a || !b) return null;
            const lift = Math.min(40, Math.abs(b.x - a.x) / 2 + 12);
            return (
              <path
                key={`${from}-${to}`}
                d={`M${String(a.x)},${String(a.y - 8)} C${String(a.x)},${String(a.y - lift)} ${String(b.x)},${String(b.y - lift)} ${String(b.x)},${String(b.y - 8)}`}
                fill="none"
                stroke="var(--color-blood-400)"
                strokeWidth={2}
                markerEnd={`url(#${arrow})`}
                style={fade}
              >
                <title>{`${data.events.find((e) => e.id === from)?.name ?? ""} led to ${data.events.find((e) => e.id === to)?.name ?? ""}`}</title>
              </path>
            );
          })}

        {/* Memories: forward arcs above, backward arcs (from the future) below in gold */}
        {layers.has("memories") &&
          data.memories.flatMap((memory) => {
            const fromY = memory.experiencedBy ? laneY.get(memory.experiencedBy) : undefined;
            if (fromY === undefined || !memory.date) return [];
            const fromX = scale.x(memory.date.earliest);
            return memory.received.flatMap((received) => {
              const toY = laneY.get(received.by);
              if (toY === undefined || !received.span.start) return [];
              const toX = scale.x(received.span.start.earliest);
              const backward = toX < fromX;
              const bend = (backward ? 1 : -1) * (Math.abs(toX - fromX) / 3 + 30);
              const midY = (fromY + toY) / 2 + bend;
              return [
                <path
                  key={`${memory.id}-${received.by}`}
                  d={`M${String(fromX)},${String(fromY)} Q${String((fromX + toX) / 2)},${String(midY)} ${String(toX)},${String(toY)}`}
                  fill="none"
                  stroke={backward ? "var(--color-brass-300)" : "var(--color-military-400)"}
                  strokeWidth={2}
                  strokeDasharray={backward ? "6 4" : undefined}
                  style={fade}
                  {...activate(memory.id)}
                >
                  <title>{`${memory.name}${backward ? " — received before it happened" : ""}`}</title>
                </path>,
              ];
            });
          })}

        {/* Events: diamonds on each participant's lane, joined when shared */}
        {data.events.map((event) => {
          const points = eventPoints(event.id);
          const [first] = points;
          if (!first) return null;
          const isCenter = event.id === data.center;
          const dim = later(event.span.start?.earliest);
          const ys = points.map((p) => p.y);
          return (
            <g
              key={event.id}
              opacity={dim ? 0.35 : 1}
              style={glide(event.id, first)}
              {...activate(event.id)}
              aria-label={event.name}
            >
              <title>{event.name}</title>
              {points.length > 1 && (
                <line
                  x1={first.x}
                  x2={first.x}
                  y1={Math.min(...ys)}
                  y2={Math.max(...ys)}
                  stroke="var(--color-military-600)"
                  strokeWidth={1.5}
                />
              )}
              {points.map((point) => (
                <rect
                  key={point.y}
                  x={point.x - 6}
                  y={point.y - 6}
                  width={12}
                  height={12}
                  transform={`rotate(45 ${String(point.x)} ${String(point.y)})`}
                  fill={isCenter ? "var(--color-brass-300)" : "var(--color-military-400)"}
                  stroke="var(--color-charcoal-950)"
                  strokeWidth={1.5}
                />
              ))}
              {isCenter && (
                <text
                  x={first.x}
                  y={first.y - 14}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight={600}
                  fill="var(--color-brass-300)"
                >
                  {event.name}
                </text>
              )}
            </g>
          );
        })}

        {/* The chosen moment */}
        {momentBound !== null && (
          <g style={fade}>
            <line
              x1={scale.x(momentBound)}
              x2={scale.x(momentBound)}
              y1={AXIS_HEIGHT - 6}
              y2={height - 16}
              stroke="var(--color-brass-500)"
              strokeWidth={1.5}
            />
            <text
              x={scale.x(momentBound)}
              y={AXIS_HEIGHT - 10}
              textAnchor="middle"
              fontSize={10}
              fontFamily="var(--font-mono)"
              fill="var(--color-brass-300)"
            >
              NOW
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
