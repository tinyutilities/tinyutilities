"use client";

type ErrorCardProps = {
  title: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
};

/** Consistent error presentation: unsupported format, file too large, processing failed, etc. */
export function ErrorCard({ title, message, onRetry, retryLabel = "Try again" }: ErrorCardProps) {
  return (
    <div className="animate-fade-up rounded-2xl border border-red-300/25 bg-red-300/[0.07] p-4 sm:p-5" role="alert">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-red-300/15 text-red-200 ring-1 ring-red-300/40">
          <svg aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="mt-1 text-sm leading-6 text-red-100/85">{message}</p>
          {onRetry ? (
            <button
              className="mt-3 rounded-full border border-red-300/30 px-4 py-2 text-xs font-semibold text-red-100 transition hover:border-red-200/50 hover:bg-red-300/10"
              onClick={onRetry}
              type="button"
            >
              {retryLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
