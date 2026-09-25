import { ApiError } from "../api/client";

/** Loading and error states shared by every data view. Errors never reveal hidden data. */
export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <p role="status" className="text-sm text-parchment-500">
      {label}
    </p>
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
