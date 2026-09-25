import { useRef } from "react";
import { useCutoff, useReader } from "../../stores/reader";
import { ChapterPicker } from "./ChapterPicker";

/** Shows the reader's chapter in the header and lets them change it. */
export function ChapterButton() {
  const cutoff = useCutoff();
  const setCutoff = useReader((state) => state.setCutoff);
  const dialog = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className="rounded border border-charcoal-600 px-3 py-1 font-mono text-sm whitespace-nowrap text-parchment-300 hover:border-brass-500"
        aria-label={`Reading up to chapter ${String(cutoff)}. Change chapter`}
      >
        Ch. {cutoff}
      </button>
      <dialog
        ref={dialog}
        className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-lg border border-charcoal-600 bg-charcoal-900 p-6 text-parchment-100 backdrop:bg-black/70"
      >
        <h2 className="mb-4 text-xl font-semibold">Change your chapter</h2>
        <ChapterPicker
          key={cutoff}
          initial={cutoff}
          confirmLabel="Update"
          onConfirm={(chapter) => {
            setCutoff(chapter);
            dialog.current?.close();
          }}
        />
      </dialog>
    </>
  );
}
