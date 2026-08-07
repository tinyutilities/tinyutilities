"use client";

import type { StatValue } from "./types";

type EstimatePanelProps = {
  /**
   * Facts the tool can state with certainty before processing starts — file count,
   * total input size, output format, etc. Never pass a guessed output size or duration:
   * if a tool can't calculate it honestly, omit it rather than fabricate a number.
   */
  items: StatValue[];
};

/** A quiet "here's what's about to happen" summary shown above the primary action. */
export function EstimatePanel({ items }: EstimatePanelProps) {
  if (items.length === 0) return null;

  return (
    <dl className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-[#080b1a]/70 p-4 text-sm">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-xs text-slate-500">{item.label}</dt>
          <dd className="mt-0.5 truncate font-semibold text-slate-200">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
