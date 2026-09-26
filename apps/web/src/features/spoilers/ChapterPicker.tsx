import { FIRST_CHAPTER, LAST_CHAPTER } from "@paths/shared/constants";
import { type CSSProperties, useId, useState } from "react";

interface ChapterPickerProps {
  initial?: number | null;
  onConfirm: (chapter: number) => void;
  confirmLabel?: string;
  /** "hero" is the title screen's large version; "compact" fits the change-chapter dialog. */
  variant?: "hero" | "compact";
}

const MARKS = [FIRST_CHAPTER, 35, 70, 105, LAST_CHAPTER];

/** Choose the last chapter read (docs/model/spoilers.md §1). Volumes come once they're mapped. */
export function ChapterPicker({
  initial,
  onConfirm,
  confirmLabel = "Continue",
  variant = "compact",
}: ChapterPickerProps) {
  const [chapter, setChapter] = useState(initial ?? FIRST_CHAPTER);
  // What's typed in the number box, so it can be cleared and retyped; clamped when committed.
  const [text, setText] = useState(String(chapter));
  const sliderId = useId();
  const numberId = useId();
  const hero = variant === "hero";

  const clamp = (value: number) =>
    Math.min(LAST_CHAPTER, Math.max(FIRST_CHAPTER, Math.round(value)));

  const commit = () => {
    const typed = Number(text);
    const next = text.trim() !== "" && Number.isFinite(typed) ? clamp(typed) : chapter;
    setChapter(next);
    setText(String(next));
    return next;
  };

  const fill = `${String(((chapter - FIRST_CHAPTER) / (LAST_CHAPTER - FIRST_CHAPTER)) * 100)}%`;

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        onConfirm(commit());
      }}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-end justify-between gap-4">
          <label htmlFor={sliderId} className="label">
            Last chapter read
          </label>
          <div className="flex items-baseline gap-2">
            <span aria-hidden="true" className="font-mono text-xs tracking-[0.2em] text-brass-500">
              CH.
            </span>
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
              className={`display w-[3.2ch] min-w-[1ch] bg-transparent text-right [field-sizing:content] text-parchment-50 tabular-nums [appearance:textfield] focus:outline-none focus-visible:text-brass-300 [&::-webkit-inner-spin-button]:appearance-none ${
                hero ? "text-7xl sm:text-8xl" : "text-5xl"
              }`}
            />
          </div>
        </div>
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
          className="rail w-full"
          style={{ "--fill": fill } as CSSProperties}
        />
        <div
          aria-hidden="true"
          className="flex justify-between font-mono text-[0.65rem] text-parchment-500"
        >
          {MARKS.map((mark) => (
            <span key={mark}>{mark}</span>
          ))}
        </div>
        <p className="text-sm text-parchment-500">
          PATHS will show only what the manga has revealed up to chapter {chapter}.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button type="submit" className="btn btn-primary notch">
          {confirmLabel}
          <span aria-hidden="true">→</span>
        </button>
        <button
          type="button"
          onClick={() => {
            onConfirm(LAST_CHAPTER);
          }}
          className="btn btn-ghost"
        >
          I&apos;ve finished the manga
        </button>
      </div>
    </form>
  );
}
