import { ApiError } from "../api/client";

/** Loading and error states shared by every data view. Errors never reveal hidden data. */
export function Loading({
  label = "Loading…",
  variant = "lines",
}: {
  label?: string;
  /** "panel" holds the space of a large view (e.g. the graph) so the page doesn't jump. */
  variant?: "lines" | "panel";
}) {
  if (variant === "panel") {
    return (
      <div
        role="status"
        className="frame flex h-[60vh] min-h-80 flex-col items-center justify-center gap-4"
      >
        <span aria-hidden="true" className="size-3 rotate-45 animate-pulse bg-brass-400" />
        <span className="label">{label}</span>
      </div>
    );
  }
  return (
    <div role="status" className="flex flex-col gap-2.5 py-1">
      <span className="sr-only">{label}</span>
      <span aria-hidden="true" className="skeleton h-3 w-3/4" />
      <span aria-hidden="true" className="skeleton h-3 w-1/2" />
      <span aria-hidden="true" className="skeleton h-3 w-2/3" />
    </div>
  );
}

export function ErrorMessage({ error }: { error: unknown }) {
  const message =
    error instanceof ApiError && (error.code === "beyond_cutoff" || error.code === "not_found")
      ? error.message
      : "Couldn't reach the PATHS API. It may be waking up — try again in a moment.";
  return (
    <p role="alert" className="text-sm text-blood-400">
      {message}
    </p>
  );
}
