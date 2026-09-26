import { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useEntities, useSearch } from "../../api/queries";
import { KIND_LABELS } from "../../lib/format";
import { useRecent } from "../../stores/recent";
import { useUi } from "../../stores/ui";
import { describeMatch, groupResults, markTerms, visibleRecent } from "./palette";

interface Option {
  id: string;
  label: string;
  hint?: string | null;
  tag?: string;
  run: () => void;
}

function Highlighted({ text, terms }: { text: string; terms: readonly string[] }) {
  return (
    <>
      {markTerms(text, terms).map((part, index) =>
        part.match ? (
          <mark key={index} className="bg-transparent font-semibold text-brass-300">
            {part.text}
          </mark>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </>
  );
}

/** The header's search field: opens the palette. */
export function PaletteTrigger() {
  const setOpen = useUi((state) => state.setPaletteOpen);
  return (
    <button
      type="button"
      onClick={() => {
        setOpen(true);
      }}
      className="flex w-full max-w-sm items-center justify-between gap-3 border border-charcoal-700 bg-charcoal-950/80 px-3 py-1.5 text-left text-sm text-parchment-500 transition-colors hover:border-charcoal-600 hover:text-parchment-300"
    >
      <span>Search people, events, places…</span>
      <kbd className="border border-charcoal-700 px-1.5 font-mono text-[0.65rem] tracking-wider">
        Ctrl K
      </kbd>
    </button>
  );
}

/**
 * Ctrl/⌘ + K from anywhere. Empty: recent entities and quick actions. Typing: results grouped by
 * kind, each with why it matched. ↑/↓ to move, Enter to open, Esc to close.
 */
export function CommandPalette() {
  const open = useUi((state) => state.paletteOpen);
  const setOpen = useUi((state) => state.setPaletteOpen);
  const openChapter = useUi((state) => state.setChapterOpen);
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const navigate = useNavigate();
  const listId = useId();

  const { data: results, isFetching } = useSearch(query);
  const { data: known } = useEntities();
  const recentIds = useRecent((state) => state.ids);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(!useUi.getState().paletteOpen);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [setOpen]);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) {
      element.showModal();
      input.current?.focus();
    } else if (!open && element.open) {
      element.close();
    }
  }, [open]);

  const close = () => {
    setOpen(false);
    setQuery("");
    setActive(0);
  };
  const go = (path: string) => () => {
    close();
    void navigate(path);
  };

  const searching = query.trim().length > 0;
  // Only highlight while searching: the last query's words don't apply to Recent.
  const terms = searching ? (results?.terms ?? []) : [];
  const groups = searching ? groupResults(results?.items ?? []) : [];

  const sections: { title: string; options: Option[] }[] = searching
    ? groups.map((group) => ({
        title: `${KIND_LABELS[group.kind]}s`,
        options: group.items.map((item) => ({
          id: item.id,
          label: item.name,
          hint: describeMatch(item, terms),
          tag: KIND_LABELS[item.kind],
          run: go(`/explore/${item.id}`),
        })),
      }))
    : [
        {
          title: "Recent",
          options: visibleRecent(recentIds, known?.items ?? []).map((entity) => ({
            id: entity.id,
            label: entity.name,
            tag: KIND_LABELS[entity.kind],
            run: go(`/explore/${entity.id}`),
          })),
        },
        {
          title: "Go to",
          options: [
            { id: "action-explore", label: "Explore everything", run: go("/explore") },
            { id: "action-timeline", label: "Timeline", run: go("/timeline") },
            {
              id: "action-chapter",
              label: "Change your chapter",
              run: () => {
                close();
                openChapter(true);
              },
            },
          ],
        },
      ].filter((section) => section.options.length > 0);

  const options = sections.flatMap((section) => section.options);
  const current = options[Math.min(active, options.length - 1)];

  return (
    <dialog
      ref={dialog}
      aria-label="Search"
      onClose={close}
      onClick={(event) => {
        // A click on the backdrop (the dialog element itself) closes it.
        if (event.target === dialog.current) close();
      }}
      className="mx-auto mt-[12vh] w-[min(40rem,calc(100vw-2rem))] border border-charcoal-700 bg-charcoal-950 p-0 text-parchment-100 shadow-2xl shadow-black backdrop:bg-ink/80 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-center gap-3 border-b border-charcoal-700 px-4 py-3">
        <input
          ref={input}
          type="search"
          role="combobox"
          aria-label="Search"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={current ? `${listId}-${current.id}` : undefined}
          aria-autocomplete="list"
          placeholder="Search… try “trost 850” or “eren titan”"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActive((i) => Math.min(i + 1, options.length - 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            } else if (event.key === "Enter" && current) {
              event.preventDefault();
              current.run();
            }
          }}
          className="flex-1 bg-transparent text-lg outline-none placeholder:text-parchment-500"
        />
        {searching && results?.year !== null && results?.year !== undefined && (
          <span className="rounded-full border border-brass-500 px-2 py-0.5 font-mono text-xs text-brass-300">
            in {results.year}
          </span>
        )}
      </div>

      <div
        id={listId}
        role="listbox"
        aria-label="Results"
        className="max-h-[60vh] overflow-y-auto p-2"
      >
        {searching && options.length === 0 && (
          <p className="px-3 py-6 text-center text-sm text-parchment-500">
            {isFetching ? "Searching…" : "Nothing matches in what you've read."}
          </p>
        )}
        {sections.map((section) => (
          <div key={section.title} role="group" aria-label={section.title} className="mb-2">
            <p className="label px-3 py-1">{section.title}</p>
            {section.options.map((option) => {
              const selected = option === current;
              return (
                <div
                  key={option.id}
                  id={`${listId}-${option.id}`}
                  role="option"
                  aria-selected={selected}
                  onMouseMove={() => {
                    setActive(options.indexOf(option));
                  }}
                  onClick={option.run}
                  className={`flex cursor-pointer items-center justify-between gap-4 border-l-2 px-3 py-2 ${
                    selected ? "border-brass-400 bg-charcoal-800" : "border-transparent"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate">
                      <Highlighted text={option.label} terms={terms} />
                    </span>
                    {option.hint && (
                      <span className="block truncate text-xs text-parchment-500">
                        <Highlighted text={option.hint} terms={terms} />
                      </span>
                    )}
                  </span>
                  {option.tag && <span className="label shrink-0">{option.tag}</span>}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <p className="flex gap-4 border-t border-charcoal-700 px-4 py-2 font-mono text-xs text-parchment-500">
        <span>↑↓ move</span>
        <span>Enter open</span>
        <span>Esc close</span>
      </p>
    </dialog>
  );
}
