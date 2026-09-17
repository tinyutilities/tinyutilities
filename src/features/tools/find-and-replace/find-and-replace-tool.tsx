"use client";

import { useId, useMemo, useRef, useState } from "react";
import { FilenameField, buildDownloadFilename, formatBytes } from "@/components/upload";

const defaultFilenameBase = "TinyUtility-Replaced";

/** Escapes every regex metacharacter so a user's Find text is always matched as literal
 *  characters — never interpreted as a pattern. This tool has no regex mode. */
function escapeForLiteralMatch(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Builds the RegExp used for both the live match count and Replace All. Whole-word matching
 * uses Unicode property escapes (`\p{L}`, `\p{N}`) rather than JavaScript's plain `\b`, which is
 * defined only in terms of ASCII `[A-Za-z0-9_]` — a naive `\b` would silently fail to match
 * whole words in scripts like Hindi or Japanese at all, since none of those characters count as
 * "word" characters to it. This still can't do true linguistic segmentation (Japanese, for
 * example, doesn't use spaces between words at all), but it correctly treats letters and digits
 * from any script as "word" characters, which `\b` does not.
 */
function buildFindRegex(find: string, caseSensitive: boolean, wholeWord: boolean): RegExp | null {
  if (!find) return null;

  let pattern = escapeForLiteralMatch(find);

  if (wholeWord) {
    pattern = `(?<![\\p{L}\\p{N}_])${pattern}(?![\\p{L}\\p{N}_])`;
  }

  try {
    return new RegExp(pattern, caseSensitive ? "gu" : "giu");
  } catch {
    return null;
  }
}

function isTextFile(file: File) {
  return !file.type || file.type === "text/plain";
}

function downloadText(text: string, filename: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.download = filename;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

export function FindAndReplaceTool() {
  const textareaId = useId();
  const findId = useId();
  const replaceId = useId();
  const caseSensitiveId = useId();
  const wholeWordId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [text, setText] = useState("");
  const [findValue, setFindValue] = useState("");
  const [replaceValue, setReplaceValue] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [previousText, setPreviousText] = useState<string | null>(null);
  const [lastReplaceCount, setLastReplaceCount] = useState<number | null>(null);
  const [uploadMessage, setUploadMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [filenameBase, setFilenameBase] = useState(defaultFilenameBase);

  const findRegex = useMemo(() => buildFindRegex(findValue, caseSensitive, wholeWord), [findValue, caseSensitive, wholeWord]);

  const matchCount = useMemo(() => {
    if (!findRegex) return 0;
    const matches = text.match(findRegex);
    return matches ? matches.length : 0;
  }, [text, findRegex]);

  const matchCountLabel = !findValue
    ? "Enter text to find."
    : matchCount === 0
      ? "No matches"
      : matchCount === 1
        ? "1 match"
        : `${matchCount} matches`;

  const outputBlob = useMemo(() => new Blob([text], { type: "text/plain;charset=utf-8" }), [text]);

  const replaceAll = () => {
    if (!findRegex) return;

    if (matchCount === 0) {
      setLastReplaceCount(0);
      return;
    }

    setPreviousText(text);
    // A replacer FUNCTION (not a string) is used so the replacement text is inserted
    // completely literally — a string replacer would otherwise give special meaning to
    // sequences like "$&", "$$", or "$'" if the user happened to type them.
    setText(text.replace(findRegex, () => replaceValue));
    setLastReplaceCount(matchCount);
  };

  const restoreOriginal = () => {
    if (previousText === null) return;
    setText(previousText);
    setPreviousText(null);
    setLastReplaceCount(null);
  };

  const clearAll = () => {
    setText("");
    setPreviousText(null);
    setLastReplaceCount(null);
    setUploadMessage(null);
  };

  const handleUpload = (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;

    if (!isTextFile(file)) {
      setUploadMessage({ text: "Please choose a TXT file.", isError: true });
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const loaded = typeof reader.result === "string" ? reader.result : "";
      setText(loaded);
      setPreviousText(null);
      setLastReplaceCount(null);
      setUploadMessage({ text: `${file.name} loaded locally.`, isError: false });
    };
    reader.onerror = () => {
      setUploadMessage({ text: "Could not read that file.", isError: true });
    };

    try {
      reader.readAsText(file);
    } catch {
      setUploadMessage({ text: "Could not read that file.", isError: true });
    }
  };

  const handleDownload = () => {
    downloadText(text, buildDownloadFilename(filenameBase, "txt", defaultFilenameBase));
  };

  const hasText = text.length > 0;

  return (
    <section className="mt-16 space-y-6">
      <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-5 text-sm font-medium leading-6 text-cyan-100">
        Your text never leaves your device. Find and replace happens entirely in your browser.
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 sm:p-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <label className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300" htmlFor={textareaId}>
              Text editor
            </label>
            <div className="flex flex-wrap gap-3">
              <button
                className="rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/10"
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                Upload TXT
              </button>
              <button
                className="rounded-full border border-red-300/25 bg-red-300/10 px-5 py-2.5 text-sm font-semibold text-red-100 transition hover:-translate-y-0.5 hover:border-red-200/50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                disabled={!hasText}
                onClick={clearAll}
                type="button"
              >
                Clear
              </button>
              <input
                accept=".txt,text/plain"
                aria-label="Upload a TXT file"
                className="sr-only"
                onChange={(event) => {
                  handleUpload(event.target.files);
                  event.target.value = "";
                }}
                ref={fileInputRef}
                type="file"
              />
            </div>
          </div>

          <textarea
            className="mt-5 min-h-[24rem] w-full resize-y rounded-2xl border border-white/10 bg-[#080b1a]/80 p-5 font-mono text-sm leading-6 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/20 sm:min-h-[28rem]"
            id={textareaId}
            onChange={(event) => setText(event.target.value)}
            placeholder="Start typing, paste text, or upload a TXT file."
            spellCheck="true"
            value={text}
          />

          {uploadMessage ? (
            <p className={`mt-3 text-sm ${uploadMessage.isError ? "text-red-300" : "text-teal-300"}`} role={uploadMessage.isError ? "alert" : "status"}>
              {uploadMessage.text}
            </p>
          ) : null}
        </div>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 sm:p-6">
            <h2 className="text-lg font-semibold text-white">Find &amp; replace</h2>

            <div className="mt-5 grid gap-4">
              <label className="block" htmlFor={findId}>
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Find</span>
                <input
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#080b1a] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-violet-300/50 focus:ring-2 focus:ring-violet-300/20"
                  id={findId}
                  onChange={(event) => setFindValue(event.target.value)}
                  placeholder="Text to find"
                  type="text"
                  value={findValue}
                />
              </label>

              <label className="block" htmlFor={replaceId}>
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Replace with</span>
                <input
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#080b1a] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-violet-300/50 focus:ring-2 focus:ring-violet-300/20"
                  id={replaceId}
                  onChange={(event) => setReplaceValue(event.target.value)}
                  placeholder="Replacement text (leave empty to remove matches)"
                  type="text"
                  value={replaceValue}
                />
              </label>

              <div className="grid gap-2 sm:grid-cols-2">
                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#080b1a]/70 px-4 py-2.5 text-sm text-slate-200 transition hover:border-violet-300/30" htmlFor={caseSensitiveId}>
                  <span>Case sensitive</span>
                  <input
                    checked={caseSensitive}
                    className="size-4 accent-violet-400"
                    id={caseSensitiveId}
                    onChange={() => setCaseSensitive((current) => !current)}
                    type="checkbox"
                  />
                </label>
                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#080b1a]/70 px-4 py-2.5 text-sm text-slate-200 transition hover:border-violet-300/30" htmlFor={wholeWordId}>
                  <span>Match whole word</span>
                  <input
                    checked={wholeWord}
                    className="size-4 accent-violet-400"
                    id={wholeWordId}
                    onChange={() => setWholeWord((current) => !current)}
                    type="checkbox"
                  />
                </label>
              </div>

              {wholeWord ? (
                <p className="text-xs leading-5 text-slate-500">
                  Matches complete words — bounded by letters, numbers, or underscores in any language.
                  Languages without spaces between words, like Japanese, may not segment the way you expect.
                </p>
              ) : null}

              <p aria-live="polite" className="text-sm font-semibold text-violet-200">
                {matchCountLabel}
              </p>
            </div>

            <button
              className="mt-5 w-full rounded-full bg-gradient-to-r from-[#4F46E5] via-[#06B6D4] to-[#14B8A6] px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:shadow-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              disabled={!findValue}
              onClick={replaceAll}
              type="button"
            >
              Replace All
            </button>

            {previousText !== null ? (
              <button
                className="mt-3 w-full rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-white/30 hover:bg-white/10"
                onClick={restoreOriginal}
                type="button"
              >
                Restore Original
              </button>
            ) : null}

            {lastReplaceCount !== null ? (
              <p aria-live="polite" className="mt-3 text-sm text-teal-200" role="status">
                {lastReplaceCount === 0
                  ? "Nothing to replace."
                  : `Replaced ${lastReplaceCount} match${lastReplaceCount === 1 ? "" : "es"}.`}
              </p>
            ) : null}
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 sm:p-6">
            <h2 className="text-lg font-semibold text-white">Download</h2>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Downloads the current editor text, including any edits or replacements you&apos;ve made.
            </p>
            <div className="mt-4">
              <FilenameField extension="txt" onChange={setFilenameBase} value={filenameBase} />
            </div>
            <p className="mt-3 text-xs text-slate-500">File size: {formatBytes(outputBlob.size)}</p>
            <button
              className="mt-4 w-full rounded-full border border-cyan-300/25 bg-cyan-300/10 px-6 py-3 text-sm font-semibold text-cyan-100 transition hover:-translate-y-0.5 hover:border-cyan-200/50 hover:bg-cyan-300/15 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
              disabled={!hasText}
              onClick={handleDownload}
              type="button"
            >
              Download TXT
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}
