import { useEffect, useRef } from "react";
import { useCutoff, useReader } from "../../stores/reader";
import { useUi } from "../../stores/ui";
import { ChapterPicker } from "./ChapterPicker";

/** Shows the reader's chapter in the header and lets them change it (also from the palette). */
export function ChapterButton() {
  const cutoff = useCutoff();
  const setCutoff = useReader((state) => state.setCutoff);
  const open = useUi((state) => state.chapterOpen);
  const setOpen = useUi((state) => state.setChapterOpen);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    else if (!open && element.open) element.close();
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
        }}
        className="notch border border-brass-700 bg-charcoal-900 px-3 py-1.5 font-mono text-xs tracking-[0.16em] whitespace-nowrap text-brass-300 uppercase transition-colors hover:border-brass-400 hover:text-brass-200"
        aria-label={`Reading up to chapter ${String(cutoff)}. Change chapter`}
      >
        Ch. {cutoff}
      </button>
      <dialog
        ref={dialog}
        onClose={() => {
          setOpen(false);
        }}
        className="m-auto w-[min(34rem,calc(100vw-2rem))] border border-charcoal-700 bg-charcoal-950 p-7 text-parchment-100 shadow-2xl shadow-black backdrop:bg-ink/80 backdrop:backdrop-blur-sm"
      >
        <p className="label text-brass-400">Spoiler shield</p>
        <h2 className="display mb-6 text-4xl">Change your chapter</h2>
        <ChapterPicker
          key={cutoff}
          initial={cutoff}
          confirmLabel="Update"
          onConfirm={(chapter) => {
            setCutoff(chapter);
            setOpen(false);
          }}
        />
      </dialog>
    </>
  );
}
