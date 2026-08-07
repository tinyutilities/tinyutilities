"use client";

type ProgressIndicatorProps = {
  /** 0-100. Omit to render an honest indeterminate indicator instead of a fake percentage. */
  value?: number;
  label: string;
};

/** Determinate progress bar when `value` is known; an honest indeterminate sweep otherwise. */
export function ProgressIndicator({ value, label }: ProgressIndicatorProps) {
  const isDeterminate = typeof value === "number";

  return (
    <div
      aria-label={label}
      aria-valuemax={isDeterminate ? 100 : undefined}
      aria-valuemin={isDeterminate ? 0 : undefined}
      aria-valuenow={isDeterminate ? Math.round(value) : undefined}
      className="h-2 overflow-hidden rounded-full bg-white/10"
      role="progressbar"
    >
      {isDeterminate ? (
        <div
          className="h-full rounded-full bg-teal-300 transition-all duration-300"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      ) : (
        <div className="h-full w-1/3 animate-[indeterminate-progress_1.2s_ease-in-out_infinite] rounded-full bg-teal-300" />
      )}
    </div>
  );
}
