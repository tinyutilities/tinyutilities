"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import type { StatValue } from "./types";

type SuccessCardProps = {
  title?: string;
  subtitle: string;
  /** The single number that matters most (e.g. "Saved 67%"). Rendered large, above the supporting stats. */
  heroStat?: StatValue;
  /** Supporting details (Original/Compressed size, file count, etc). */
  stats?: StatValue[];
  onDownload: () => void;
  downloadLabel?: string;
  onReset: () => void;
  resetLabel?: string;
  /** Shows a transient "Download complete" confirmation without blocking the workflow. */
  justDownloaded?: boolean;
  /** Optional slot for per-file breakdowns below the hero. */
  children?: ReactNode;
};

/**
 * The prominent "your file is ready" hero shown once a tool's processing phase completes.
 * Replaces the upload/options section so the download action is the obvious next step —
 * see the phase-driven `showSuccessHero` pattern in each tool for how this gets swapped in.
 */
export function SuccessCard({
  title = "File Ready",
  subtitle,
  heroStat,
  stats,
  onDownload,
  downloadLabel = "Download",
  onReset,
  resetLabel = "Process Another File",
  justDownloaded = false,
  children,
}: SuccessCardProps) {
  const downloadButtonRef = useRef<HTMLButtonElement>(null);

  // Move focus to the primary action so keyboard/screen-reader users land on
  // "what to do next" the moment the hero replaces the upload section.
  useEffect(() => {
    downloadButtonRef.current?.focus();
  }, []);

  return (
    <div
      aria-labelledby="success-card-title"
      className="animate-scale-in rounded-3xl border border-teal-300/25 bg-gradient-to-br from-teal-400/[0.08] via-cyan-400/[0.06] to-transparent p-6 shadow-2xl shadow-teal-950/20 sm:p-8"
      role="region"
    >
      <div className="flex flex-col items-center text-center">
        <span className="grid size-16 shrink-0 place-items-center rounded-full bg-teal-300/15 text-teal-200 ring-1 ring-teal-300/40 sm:size-20">
          <svg aria-hidden="true" className="size-8 sm:size-10" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.25} viewBox="0 0 24 24">
            <path d="m5 13 4 4L19 7" />
          </svg>
        </span>
        <h2 className="mt-3 text-xl font-semibold text-white sm:text-2xl" id="success-card-title">
          {title}
        </h2>
        <p className="mt-1 text-sm text-teal-100/80 sm:text-base">{subtitle}</p>

        {heroStat ? (
          <p className="mt-4">
            <span className="text-4xl font-bold tracking-tight text-teal-200 sm:text-5xl">{heroStat.value}</span>
            <span className="ml-2 text-sm font-medium uppercase tracking-[0.14em] text-teal-100/70">
              {heroStat.label}
            </span>
          </p>
        ) : null}
      </div>

      {stats && stats.length > 0 ? (
        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((stat) => (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center sm:p-4" key={stat.label}>
              <dt className="text-xs text-slate-400">{stat.label}</dt>
              <dd className="mt-1 break-words text-base font-semibold text-white sm:text-lg">{stat.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {/* Download is the visual focus: full-width, largest control, gradient fill.
          Reset is intentionally quieter so it never competes for attention. */}
      <div className="mt-6 flex flex-col items-center gap-3">
        <button
          className="w-full rounded-full bg-gradient-to-r from-[#4F46E5] via-[#06B6D4] to-[#14B8A6] px-6 py-4 text-base font-semibold text-white shadow-xl shadow-cyan-500/30 transition hover:-translate-y-0.5 hover:shadow-cyan-500/40 focus:outline-none focus:ring-2 focus:ring-cyan-300/60 focus:ring-offset-2 focus:ring-offset-[#060816] sm:text-lg"
          onClick={onDownload}
          ref={downloadButtonRef}
          type="button"
        >
          {downloadLabel}
        </button>
        <button
          className="rounded-full px-4 py-2 text-sm font-medium text-slate-300 transition hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-300/50 focus:ring-offset-2 focus:ring-offset-[#060816]"
          onClick={onReset}
          type="button"
        >
          {resetLabel}
        </button>
      </div>

      {justDownloaded ? (
        <p className="mt-1 flex items-center justify-center gap-1.5 text-sm font-medium text-teal-200" role="status">
          <svg aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} viewBox="0 0 24 24">
            <path d="m5 13 4 4L19 7" />
          </svg>
          Download complete
        </p>
      ) : null}

      {children ? <div className="mt-6">{children}</div> : null}
    </div>
  );
}
