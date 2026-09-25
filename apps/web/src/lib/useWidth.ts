import { useLayoutEffect, useState } from "react";

/**
 * An element's current width in pixels, kept up to date as it resizes. Returns a callback ref, so
 * an element that unmounts and comes back (e.g. a chart swapped for its table) is measured again.
 */
export function useWidth<T extends HTMLElement>(fallback: number) {
  const [element, setElement] = useState<T | null>(null);
  const [width, setWidth] = useState(fallback);

  useLayoutEffect(() => {
    if (!element) return;
    // The observer reports the starting size too, before the first paint.
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [element]);

  return [setElement, width] as const;
}
