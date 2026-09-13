"use client";

import { useId } from "react";

const INVALID_FILENAME_CHARS = /[/\\:*?"<>|]/g;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Strips filesystem-invalid characters and surrounding whitespace, falling back to
 *  `fallback` (default "TinyUtility") if nothing usable is left. Preserves everything else,
 *  including normal Unicode text, spaces, and punctuation — this never rewrites what the user
 *  typed beyond what's actually necessary to produce a valid filename. */
export function sanitizeBaseFilename(rawBase: string, fallback = "TinyUtility") {
  const cleaned = rawBase.replace(INVALID_FILENAME_CHARS, "").trim();

  return cleaned.length > 0 ? cleaned : fallback;
}

/** Combines a user-entered base name with a tool-controlled extension into the exact filename
 *  a download should use — sanitized, and without a doubled extension if the user already typed
 *  one matching the target (e.g. typing "photo.png" for a .png output doesn't become
 *  "photo.png.png"). This is the single place download filenames get finalized; call it once,
 *  at download time, not on every keystroke. */
export function buildDownloadFilename(rawBase: string, extension: string, fallback = "TinyUtility") {
  const cleanExtension = extension.replace(/^\.+/, "").trim().toLowerCase();
  let base = sanitizeBaseFilename(rawBase, fallback);

  if (cleanExtension) {
    const trailingExtension = new RegExp(`\\.${escapeRegExp(cleanExtension)}$`, "i");

    while (trailingExtension.test(base)) {
      base = base.replace(trailingExtension, "").trim();
    }
  }

  if (base.length === 0) {
    base = fallback;
  }

  return cleanExtension ? `${base}.${cleanExtension}` : base;
}

type FilenameFieldProps = {
  /** The base filename only — never include the extension here. */
  value: string;
  onChange: (value: string) => void;
  /** Extension the tool controls, with or without a leading dot (e.g. "png" or ".png"). */
  extension: string;
  label?: string;
  id?: string;
};

/**
 * Reusable "File name" control for any generated/downloadable result: a plain text input for
 * the base name plus a fixed, tool-supplied extension shown as a suffix the user can't edit.
 * Sanitization happens at download time via `buildDownloadFilename`, not on every keystroke —
 * the field always shows exactly what the user typed while they're typing it.
 */
export function FilenameField({ value, onChange, extension, label = "File name", id }: FilenameFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const cleanExtension = extension.replace(/^\.+/, "");

  return (
    <label className="block text-left" htmlFor={inputId}>
      <span className="text-sm font-semibold text-white">{label}</span>
      <div className="mt-2 flex items-stretch overflow-hidden rounded-xl border border-white/10 bg-[#080b1a] transition focus-within:border-cyan-300/60 focus-within:ring-2 focus-within:ring-cyan-300/20">
        <input
          className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
          id={inputId}
          onChange={(event) => onChange(event.target.value)}
          placeholder="TinyUtility"
          spellCheck={false}
          type="text"
          value={value}
        />
        <span className="flex shrink-0 items-center border-l border-white/10 bg-white/[0.03] px-3 text-sm font-medium text-slate-400">
          .{cleanExtension}
        </span>
      </div>
    </label>
  );
}
