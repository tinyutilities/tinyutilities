"use client";

import { useId, useRef, useState } from "react";

type UploadCardProps = {
  /** input[accept] value, e.g. "image/jpeg,image/png,image/webp" */
  accept: string;
  /** Human-readable list of supported formats, e.g. "JPG, PNG, and WEBP". */
  formatsLabel: string;
  /** Optional extra hint, e.g. "Maximum 100 MB per image." */
  helperText?: string;
  multiple?: boolean;
  disabled?: boolean;
  /** Compact bar instead of the full empty state — render this once files are already selected
   *  so the dropzone doesn't keep dominating the page (still supports drag & drop to add more). */
  compact?: boolean;
  onFiles: (files: FileList | File[]) => void;
};

/**
 * Drag & drop / click-to-upload / mobile tap target, with a polished empty state.
 *
 * Drag & drop is mouse/touch-only by nature, so the "Choose Files" (or "Add files") button
 * is always rendered alongside it as the full keyboard- and screen-reader-accessible path —
 * never make the dropzone the only way to select files.
 */
export function UploadCard({
  accept,
  formatsLabel,
  helperText,
  multiple = false,
  disabled = false,
  compact = false,
  onFiles,
}: UploadCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const inputId = useId();

  const openPicker = () => {
    if (!disabled) inputRef.current?.click();
  };

  const dragHandlers = {
    onDragLeave: () => setIsDragActive(false),
    onDragOver: (event: React.DragEvent) => {
      event.preventDefault();
      if (!disabled) setIsDragActive(true);
    },
    onDrop: (event: React.DragEvent) => {
      event.preventDefault();
      setIsDragActive(false);
      if (!disabled) onFiles(event.dataTransfer.files);
    },
  };

  const fileInput = (
    <input
      accept={accept}
      className="sr-only"
      disabled={disabled}
      id={inputId}
      multiple={multiple}
      onChange={(event) => {
        if (event.target.files && event.target.files.length > 0) {
          onFiles(event.target.files);
          event.target.value = "";
        }
      }}
      ref={inputRef}
      type="file"
    />
  );

  if (compact) {
    return (
      <div
        className={`flex items-center justify-between gap-3 rounded-xl border border-dashed px-4 py-3 transition ${
          isDragActive ? "border-cyan-200/70 bg-cyan-300/10" : "border-white/15 bg-white/[0.03]"
        }`}
        {...dragHandlers}
      >
        <p className="text-sm text-slate-300">Drag more files here, or</p>
        <button
          className="shrink-0 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-100 transition hover:border-cyan-300/40 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-300/50 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled}
          onClick={openPicker}
          type="button"
        >
          Add files
        </button>
        {fileInput}
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border border-dashed p-6 text-center transition sm:p-10 ${
        isDragActive
          ? "border-cyan-200/70 bg-cyan-300/10"
          : "border-cyan-300/35 bg-[#080b1a]/70 hover:border-cyan-200/60"
      }`}
      {...dragHandlers}
    >
      <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600/25 via-cyan-500/20 to-teal-400/20 text-cyan-200 ring-1 ring-white/10 sm:size-14">
        <svg
          aria-hidden="true"
          className="size-6 sm:size-7"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          viewBox="0 0 24 24"
        >
          <path d="M12 16V4m0 0-4 4m4-4 4 4" />
          <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
        </svg>
      </div>
      <p className="mt-3 text-base font-semibold text-white sm:mt-4 sm:text-lg">
        {isDragActive ? "Drop to upload" : "Drag files here"}
      </p>
      <p className="mt-1 text-sm text-slate-400">or tap below to choose files from your device</p>
      <label className="sr-only" htmlFor={inputId}>
        Choose files
      </label>
      <button
        className="mt-5 rounded-full bg-gradient-to-r from-[#4F46E5] via-[#06B6D4] to-[#14B8A6] px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:shadow-cyan-500/30 focus:outline-none focus:ring-2 focus:ring-cyan-300/50 disabled:cursor-not-allowed disabled:opacity-60 sm:mt-6"
        disabled={disabled}
        onClick={openPicker}
        type="button"
      >
        Choose Files
      </button>
      <p className="mt-3 text-xs leading-5 text-slate-500 sm:mt-4">
        Supports {formatsLabel}
        {helperText ? <span className="block">{helperText}</span> : null}
      </p>
      {fileInput}
    </div>
  );
}
