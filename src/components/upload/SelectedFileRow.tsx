"use client";

import type { ReactNode } from "react";

type SelectedFileRowProps = {
  name: string;
  typeLabel: string;
  sizeLabel: string;
  /** Object URL for an image thumbnail; omitted falls back to a generic file glyph. */
  thumbnailUrl?: string;
  /** Extra inline detail after the type/size line, e.g. "1920 x 1080 px". */
  detail?: string;
  actions?: ReactNode;
};

/** One row in the selected-files (or results) list: thumbnail/glyph, name, type/size/detail, actions. */
export function SelectedFileRow({
  name,
  typeLabel,
  sizeLabel,
  thumbnailUrl,
  detail,
  actions,
}: SelectedFileRowProps) {
  return (
    <article className="grid grid-cols-[56px_1fr_auto] items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3 sm:grid-cols-[72px_1fr_auto] sm:gap-4 sm:p-4">
      {thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- Local object URLs cannot be optimized by next/image.
        <img
          alt={`Preview of ${name}`}
          className="size-14 rounded-lg object-cover ring-1 ring-white/10 sm:size-[72px] sm:rounded-xl"
          src={thumbnailUrl}
        />
      ) : (
        <div className="grid size-14 place-items-center rounded-lg bg-white/5 text-slate-400 ring-1 ring-white/10 sm:size-[72px] sm:rounded-xl">
          <svg aria-hidden="true" className="size-6" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
            <path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" strokeLinejoin="round" />
            <path d="M14 2v6h6" strokeLinejoin="round" />
          </svg>
        </div>
      )}
      <div className="min-w-0">
        <h3 className="truncate text-sm font-semibold text-white">{name}</h3>
        <p className="mt-1 truncate text-xs text-slate-400 sm:text-sm">
          {typeLabel} · {sizeLabel}
          {detail ? ` · ${detail}` : ""}
        </p>
      </div>
      <div className="flex items-center justify-end gap-2">{actions}</div>
    </article>
  );
}
