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
        className="rounded border border-charcoal-600 px-3 py-1 font-mono text-sm whitespace-nowrap text-parchment-300 hover:border-brass-500"
        aria-label={`Reading up to chapter ${String(cutoff)}. Change chapter`}
      >
        Ch. {cutoff}
      </button>
      <dialog
        ref={dialog}
        onClose={() => {
          setOpen(false);
        }}
        className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-lg border border-charcoal-600 bg-charcoal-900 p-6 text-parchment-100 backdrop:bg-black/70"
      >
        <h2 className="mb-4 text-xl font-semibold">Change your chapter</h2>
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
