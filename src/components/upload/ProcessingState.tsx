"use client";

type ProcessingStateProps = {
  title: string;
  subtitle?: string;
};

/** Animated spinner + title/subtitle shown for the "preparing" and "processing" phases. */
export function ProcessingState({ title, subtitle }: ProcessingStateProps) {
  return (
    <div
      aria-live="polite"
      className="flex items-center gap-4 rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.06] p-4 sm:p-5"
      role="status"
    >
      <span className="relative grid size-10 shrink-0 place-items-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-cyan-300/30" />
        <span className="relative grid size-10 place-items-center rounded-full bg-cyan-300/15 ring-1 ring-cyan-300/40">
          <svg
            aria-hidden="true"
            className="size-5 animate-spin text-cyan-200"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path
              className="opacity-90"
              d="M22 12a10 10 0 0 0-10-10"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="3"
            />
          </svg>
        </span>
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white">{title}</p>
        {subtitle ? <p className="mt-0.5 truncate text-sm text-cyan-100/80">{subtitle}</p> : null}
      </div>
    </div>
  );
}
