import { useEffect } from "react";
import { useRecent } from "../../stores/recent";

/** Records an opened entity in the palette's "Recent" list. */
export function useRememberRecent(id: string | undefined) {
  const add = useRecent((state) => state.add);
  useEffect(() => {
    if (id) add(id);
  }, [id, add]);
}
