import { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useSearch } from "../../api/queries";
import { KIND_LABELS } from "../../lib/format";

/**
 * Search by any revealed name or spelling (a combobox: ↑/↓ to move, Enter to open, Esc to close).
 * Ctrl/⌘ + K focuses it from anywhere. The full command palette arrives in Phase 7.
 */
export function SearchBox() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const listId = useId();
  const { data, isFetching } = useSearch(query);
  const items = query.trim() ? (data?.items ?? []) : [];

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const choose = (id: string) => {
    setOpen(false);
    setQuery("");
    input.current?.blur();
    void navigate(`/explore/${id}`);
  };

  return (
    <div className="relative w-full max-w-sm">
      <input
        ref={input}
        type="search"
        role="combobox"
        aria-label="Search characters, events and places"
        aria-expanded={open && items.length > 0}
        aria-controls={listId}
        aria-activedescendant={open && items[active] ? `${listId}-${items[active].id}` : undefined}
        aria-autocomplete="list"
        placeholder="Search… (Ctrl K)"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
        }}
        onBlur={() => {
          setOpen(false);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive((i) => Math.min(i + 1, items.length - 1));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          } else if (event.key === "Enter" && items[active]) {
            event.preventDefault();
            choose(items[active].id);
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
        className="w-full rounded border border-charcoal-600 bg-charcoal-900 px-3 py-1.5 text-sm placeholder:text-parchment-500"
      />
      {open && query.trim() && (
        <ul
          id={listId}
          role="listbox"
          className="absolute top-full right-0 left-0 z-20 mt-1 overflow-hidden rounded border border-charcoal-600 bg-charcoal-900 shadow-lg"
        >
          {items.length === 0 ? (
            <li className="px-3 py-2 text-sm text-parchment-500">
              {isFetching ? "Searching…" : "No matches in what you've read."}
            </li>
          ) : (
            items.map((item, index) => (
              <li
                key={item.id}
                id={`${listId}-${item.id}`}
                role="option"
                aria-selected={index === active}
                // mousedown fires before the input's blur, so the click isn't lost.
                onMouseDown={(event) => {
                  event.preventDefault();
                  choose(item.id);
                }}
                onMouseEnter={() => {
                  setActive(index);
                }}
                className={`flex cursor-pointer items-baseline justify-between gap-3 px-3 py-2 text-sm ${
                  index === active ? "bg-charcoal-700" : ""
                }`}
              >
                <span>
                  {item.name}
                  {item.matched !== item.name && (
                    <span className="text-parchment-500"> · “{item.matched}”</span>
                  )}
                </span>
                <span className="label">{KIND_LABELS[item.kind]}</span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
