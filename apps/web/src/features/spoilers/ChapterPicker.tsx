import { FIRST_CHAPTER, LAST_CHAPTER } from "@paths/shared/constants";
import { useId, useState } from "react";

interface ChapterPickerProps {
  initial?: number | null;
  onConfirm: (chapter: number) => void;
  confirmLabel?: string;
}

/** Choose the last chapter read (docs/model/spoilers.md §1). Volumes come once they're mapped. */
export function ChapterPicker({
  initial,
  onConfirm,
  confirmLabel = "Continue",
}: ChapterPickerProps) {
  const [chapter, setChapter] = useState(initial ?? FIRST_CHAPTER);
  // What's typed in the number box, so it can be cleared and retyped; clamped when committed.
  const [text, setText] = useState(String(chapter));
  const sliderId = useId();
  const numberId = useId();

  const clamp = (value: number) =>
    Math.min(LAST_CHAPTER, Math.max(FIRST_CHAPTER, Math.round(value)));

  const commit = () => {
    const typed = Number(text);
    const next = text.trim() !== "" && Number.isFinite(typed) ? clamp(typed) : chapter;
    setChapter(next);
    setText(String(next));
    return next;
  };

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        onConfirm(commit());
      }}
    >
      <div className="flex flex-col gap-3">
        <label htmlFor={sliderId} className="label">
          Last chapter read
        </label>
        <div className="flex items-center gap-4">
          <input
            id={sliderId}
            type="range"
            min={FIRST_CHAPTER}
            max={LAST_CHAPTER}
            value={chapter}
            onChange={(event) => {
              const next = clamp(event.target.valueAsNumber);
              setChapter(next);
              setText(String(next));
            }}
            className="w-full accent-brass-500"
          />
          <label htmlFor={numberId} className="sr-only">
            Chapter number
          </label>
          <input
            id={numberId}
            type="number"
            inputMode="numeric"
            min={FIRST_CHAPTER}
            max={LAST_CHAPTER}
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              const typed = event.target.valueAsNumber;
              if (Number.isFinite(typed)) setChapter(clamp(typed));
            }}
            onBlur={commit}
            className="w-20 rounded border border-charcoal-600 bg-charcoal-900 px-2 py-1 text-right font-mono text-lg"
          />
        </div>
        <p className="text-sm text-parchment-500">
          PATHS will show only what the manga has revealed up to chapter {chapter}.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          className="rounded bg-brass-500 px-4 py-2 font-semibold text-charcoal-950 hover:bg-brass-300"
        >
          {confirmLabel}
        </button>
        <button
          type="button"
          onClick={() => {
            onConfirm(LAST_CHAPTER);
          }}
          className="rounded border border-charcoal-600 px-4 py-2 text-parchment-300 hover:border-parchment-500"
        >
          I&apos;ve finished the manga
        </button>
      </div>
    </form>
  );
}
