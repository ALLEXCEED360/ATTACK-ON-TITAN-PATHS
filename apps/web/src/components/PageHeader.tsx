import type { ReactNode } from "react";

/**
 * A page's title block, game-menu style: a bone ribbon, the title in gothic lettering and a huge
 * outlined kanji behind it (decision 0011). The kanji is decoration, hidden from screen readers.
 */
export function PageHeader({
  label,
  title,
  kanji,
  children,
  actions,
}: {
  label: string;
  title: ReactNode;
  kanji: string;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="relative isolate flex flex-wrap items-end justify-between gap-6 pt-4 pb-2">
      <span
        aria-hidden="true"
        className="kanji-watermark absolute -top-10 right-0 -z-10 text-[9rem] sm:text-[13rem]"
      >
        {kanji}
      </span>
      <div className="flex max-w-3xl flex-col gap-3">
        <span className="ribbon self-start">{label}</span>
        <h1 className="gothic text-6xl text-bone sm:text-7xl">{title}</h1>
        {children}
      </div>
      {actions}
    </header>
  );
}
