"use client";

import type { StatValue } from "./types";

type EstimatePanelProps = {
  /**
   * Facts the tool can state with certainty before processing starts — file count,
   * total input size, output format, etc. Never pass a guessed output size or duration:
   * if a tool can't calculate it honestly, omit it rather than fabricate a number.
   *
   * An item may set `span: true` (e.g. a caveat like "Little or no reduction expected.")
   * to take the full row instead of being truncated in a half-width cell.
   */
  items: StatValue[];
  /** Optional small print below the grid, e.g. crediting an estimate to a stated method. */
  caption?: string;
};

/** A quiet "here's what's about to happen" summary shown above the primary action. */
export function EstimatePanel({ items, caption }: EstimatePanelProps) {
  if (items.length === 0) return null;

  // At most one item should be marked `emphasize` — it's pulled out of the grid and rendered as
  // a large hero figure above the rest, e.g. an estimated output size next to secondary facts
  // like input size or page count. Panels with no emphasized item render exactly as before.
  const heroIndex = items.findIndex((item) => item.emphasize);
  const heroItem = heroIndex >= 0 ? items[heroIndex] : null;
  const restItems = heroItem ? items.filter((_, index) => index !== heroIndex) : items;

  return (
    <div className="rounded-2xl border border-white/10 bg-[#080b1a]/70 p-4">
      {heroItem ? (
        <div className={restItems.length > 0 ? "mb-3 border-b border-white/10 pb-3" : undefined}>
          <p className="text-xs text-slate-500">{heroItem.label}</p>
          <p className="mt-0.5 text-2xl font-bold leading-tight text-white sm:text-3xl">
            {heroItem.value}
          </p>
        </div>
      ) : null}

      {restItems.length > 0 ? (
        <dl className="grid grid-cols-2 gap-2 text-sm">
          {restItems.map((item) => (
            <div className={item.span ? "col-span-2" : undefined} key={item.label}>
              <dt className="text-xs text-slate-500">{item.label}</dt>
              <dd
                className={`mt-0.5 font-semibold text-slate-200 ${item.span ? "leading-5" : "truncate"}`}
              >
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      {caption ? <p className="mt-3 text-xs leading-5 text-slate-500">{caption}</p> : null}
    </div>
  );
}
