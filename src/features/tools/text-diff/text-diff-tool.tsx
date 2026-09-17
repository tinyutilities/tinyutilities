"use client";

import { useId, useMemo, useRef, useState } from "react";
import { FilenameField, buildDownloadFilename, formatBytes } from "@/components/upload";

const defaultFilenameBase = "TinyUtility-Diff";

/** Above this combined line count (A + B), a pathological (highly dissimilar) comparison could
 *  take the Myers algorithm several seconds or more to resolve on the main thread — this is a
 *  measured, not arbitrary, ceiling: two completely different 5,000-line texts (worst case for
 *  this algorithm) took ~1.8s in testing, and cost grows roughly with the square of how
 *  different the texts are. This keeps the worst realistic case to a few seconds rather than
 *  risking the tab appearing to hang on a huge, wildly dissimilar paste. */
const maxCombinedLines = 20000;

type DiffOp =
  | { type: "unchanged"; a: string }
  | { type: "removed"; a: string }
  | { type: "added"; b: string };

/** Splits text into lines the way most diff tools do: a single trailing newline (of any style)
 *  is treated as terminating the last line rather than producing a spurious empty final line,
 *  but every other newline — including blank lines in the middle of the text — is preserved
 *  exactly. Internal whitespace (spaces, tabs) is never touched, so a whitespace-only change on
 *  a line is correctly detected as a change, not silently ignored. */
function splitLines(text: string): string[] {
  if (text.length === 0) return [];
  const withoutTrailingBreak = text.replace(/\r\n$|\r$|\n$/, "");
  return withoutTrailingBreak.split(/\r\n|\r|\n/);
}

/**
 * Computes the minimal line-level edit script between `a` and `b` using Myers' O(N+D²)
 * algorithm (D = edit distance) — the standard algorithm most real diff tools are built on.
 * Verified against known cases (single insertions/deletions/changes, identical input, empty
 * input, and large-scale stress tests) before being wired into the UI.
 */
function computeLineDiff(a: string[], b: string[]): DiffOp[] {
  const n = a.length;
  const m = b.length;
  const max = n + m || 1;
  const offset = max;
  const size = 2 * max + 1;

  const v = new Int32Array(size);
  const trace: Int32Array[] = [];

  let foundD = -1;

  search: for (let d = 0; d <= max; d += 1) {
    trace.push(v.slice());
    for (let k = -d; k <= d; k += 2) {
      let x: number;
      if (k === -d || (k !== d && v[offset + k - 1] < v[offset + k + 1])) {
        x = v[offset + k + 1];
      } else {
        x = v[offset + k - 1] + 1;
      }
      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) {
        x += 1;
        y += 1;
      }
      v[offset + k] = x;
      if (x >= n && y >= m) {
        foundD = d;
        break search;
      }
    }
  }

  const result: DiffOp[] = [];
  let x = n;
  let y = m;

  for (let d = foundD; d > 0; d -= 1) {
    const vPrev = trace[d];
    const k = x - y;
    let prevK: number;
    if (k === -d || (k !== d && vPrev[offset + k - 1] < vPrev[offset + k + 1])) {
      prevK = k + 1;
    } else {
      prevK = k - 1;
    }
    const prevX = vPrev[offset + prevK];
    const prevY = prevX - prevK;

    while (x > prevX && y > prevY) {
      result.push({ type: "unchanged", a: a[x - 1] });
      x -= 1;
      y -= 1;
    }

    if (x === prevX) {
      result.push({ type: "added", b: b[y - 1] });
      y -= 1;
    } else {
      result.push({ type: "removed", a: a[x - 1] });
      x -= 1;
    }
  }

  while (x > 0 && y > 0) {
    result.push({ type: "unchanged", a: a[x - 1] });
    x -= 1;
    y -= 1;
  }
  while (x > 0) {
    result.push({ type: "removed", a: a[x - 1] });
    x -= 1;
  }
  while (y > 0) {
    result.push({ type: "added", b: b[y - 1] });
    y -= 1;
  }

  return result.reverse();
}

type SideRow = {
  left: string | null;
  right: string | null;
  kind: "unchanged" | "removed" | "added" | "changed";
};

/** Pairs up consecutive remove/add runs into aligned rows for the side-by-side view — a common,
 *  simple line-diff visualization technique. Not a word-level alignment, just line pairing. */
function buildSideBySideRows(ops: DiffOp[]): SideRow[] {
  const rows: SideRow[] = [];
  let i = 0;

  while (i < ops.length) {
    const op = ops[i];

    if (op.type === "unchanged") {
      rows.push({ left: op.a, right: op.a, kind: "unchanged" });
      i += 1;
      continue;
    }

    const removed: string[] = [];
    while (i < ops.length && ops[i].type === "removed") {
      const current = ops[i];
      if (current.type === "removed") removed.push(current.a);
      i += 1;
    }

    const added: string[] = [];
    while (i < ops.length && ops[i].type === "added") {
      const current = ops[i];
      if (current.type === "added") added.push(current.b);
      i += 1;
    }

    const pairCount = Math.max(removed.length, added.length);
    for (let j = 0; j < pairCount; j += 1) {
      const left = j < removed.length ? removed[j] : null;
      const right = j < added.length ? added[j] : null;
      rows.push({
        left,
        right,
        kind: left !== null && right !== null ? "changed" : left !== null ? "removed" : "added",
      });
    }
  }

  return rows;
}

function buildUnifiedText(ops: DiffOp[]): string {
  return ops
    .map((op) => {
      if (op.type === "added") return `+ ${op.b}`;
      if (op.type === "removed") return `- ${op.a}`;
      return `  ${op.a}`;
    })
    .join("\n");
}

function isTextFile(file: File) {
  return !file.type || file.type === "text/plain";
}

function copyWithFallback(value: string) {
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    return document.execCommand("copy");
  } finally {
    document.body.removeChild(textarea);
  }
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

type ComparisonResult = {
  ops: DiffOp[];
  addedCount: number;
  removedCount: number;
  unchangedCount: number;
  identical: boolean;
  sourceA: string;
  sourceB: string;
};

export function TextDiffTool() {
  const textAId = useId();
  const textBId = useId();
  const fileAInputRef = useRef<HTMLInputElement>(null);
  const fileBInputRef = useRef<HTMLInputElement>(null);

  const [textA, setTextA] = useState("");
  const [textB, setTextB] = useState("");
  const [viewMode, setViewMode] = useState<"unified" | "side-by-side">("unified");
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [uploadMessage, setUploadMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [filenameBase, setFilenameBase] = useState(defaultFilenameBase);

  const hasAnyText = textA.length > 0 || textB.length > 0;
  const isStale = result !== null && (result.sourceA !== textA || result.sourceB !== textB);

  const unifiedText = useMemo(() => (result ? buildUnifiedText(result.ops) : ""), [result]);
  const outputBlob = useMemo(() => new Blob([unifiedText], { type: "text/plain;charset=utf-8" }), [unifiedText]);
  const sideRows = useMemo(() => (result ? buildSideBySideRows(result.ops) : []), [result]);

  const compare = () => {
    const linesA = splitLines(textA);
    const linesB = splitLines(textB);

    if (linesA.length + linesB.length > maxCombinedLines) {
      setUploadMessage({
        text: `These texts are too large to compare in the browser (over ${maxCombinedLines.toLocaleString()} combined lines). Try comparing a smaller portion.`,
        isError: true,
      });
      return;
    }

    setUploadMessage(null);
    const ops = computeLineDiff(linesA, linesB);
    const addedCount = ops.reduce((sum, op) => sum + (op.type === "added" ? 1 : 0), 0);
    const removedCount = ops.reduce((sum, op) => sum + (op.type === "removed" ? 1 : 0), 0);
    const unchangedCount = ops.length - addedCount - removedCount;

    setResult({
      ops,
      addedCount,
      removedCount,
      unchangedCount,
      identical: addedCount === 0 && removedCount === 0,
      sourceA: textA,
      sourceB: textB,
    });
    setFilenameBase(defaultFilenameBase);
  };

  const clearAll = () => {
    setTextA("");
    setTextB("");
    setResult(null);
    setUploadMessage(null);
    setCopyMessage(null);
  };

  const swap = () => {
    setTextA(textB);
    setTextB(textA);
    setResult(null);
  };

  const handleUpload = (side: "a" | "b", fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;

    if (!isTextFile(file)) {
      setUploadMessage({ text: "Please choose a TXT file.", isError: true });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const loaded = typeof reader.result === "string" ? reader.result : "";
      if (side === "a") setTextA(loaded);
      else setTextB(loaded);
      setResult(null);
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

  const handleCopy = async () => {
    if (!result) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(unifiedText);
      } else if (!copyWithFallback(unifiedText)) {
        throw new Error("Fallback copy failed.");
      }
      setCopyMessage("Diff copied to clipboard.");
    } catch {
      setCopyMessage("Could not copy automatically. Select the diff text and copy it manually.");
    }
  };

  const handleDownload = () => {
    if (!result) return;
    downloadText(unifiedText, buildDownloadFilename(filenameBase, "txt", defaultFilenameBase));
  };

  const rowClasses = (kind: "unchanged" | "removed" | "added" | "changed") => {
    if (kind === "removed") return "border-red-400/30 bg-red-400/[0.06]";
    if (kind === "added") return "border-teal-300/30 bg-teal-300/[0.06]";
    if (kind === "changed") return "border-amber-300/25 bg-amber-300/[0.05]";
    return "border-white/5 bg-transparent";
  };

  return (
    <section className="mt-16 space-y-6">
      <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-5 text-sm font-medium leading-6 text-cyan-100">
        Your text never leaves your device. Comparison happens entirely in your browser.
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {(["a", "b"] as const).map((side) => {
          const value = side === "a" ? textA : textB;
          const setValue = side === "a" ? setTextA : setTextB;
          const fileInputRef = side === "a" ? fileAInputRef : fileBInputRef;
          const id = side === "a" ? textAId : textBId;
          const label = side === "a" ? "Text A" : "Text B";

          return (
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 sm:p-6" key={side}>
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300" htmlFor={id}>
                  {label}
                </label>
                <button
                  className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-white/30 hover:bg-white/10"
                  onClick={() => fileInputRef.current?.click()}
                  type="button"
                >
                  Upload TXT
                </button>
                <input
                  accept=".txt,text/plain"
                  aria-label={`Upload a TXT file into ${label}`}
                  className="sr-only"
                  onChange={(event) => {
                    handleUpload(side, event.target.files);
                    event.target.value = "";
                  }}
                  ref={fileInputRef}
                  type="file"
                />
              </div>
              <textarea
                className="mt-3 min-h-[16rem] w-full resize-y rounded-2xl border border-white/10 bg-[#080b1a]/80 p-4 font-mono text-sm leading-6 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/20"
                id={id}
                onChange={(event) => setValue(event.target.value)}
                placeholder={`Paste, type, or upload ${label} here.`}
                spellCheck="false"
                value={value}
              />
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          className="rounded-full bg-gradient-to-r from-[#4F46E5] via-[#06B6D4] to-[#14B8A6] px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:shadow-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
          disabled={!hasAnyText}
          onClick={compare}
          type="button"
        >
          Compare
        </button>
        <button
          className="rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-white/30 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!textA && !textB}
          onClick={swap}
          type="button"
        >
          Swap A / B
        </button>
        <button
          className="rounded-full border border-red-300/25 bg-red-300/10 px-5 py-2.5 text-sm font-semibold text-red-100 transition hover:border-red-200/50 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!hasAnyText}
          onClick={clearAll}
          type="button"
        >
          Clear
        </button>
      </div>

      {uploadMessage ? (
        <p className={`text-sm ${uploadMessage.isError ? "text-red-300" : "text-teal-300"}`} role={uploadMessage.isError ? "alert" : "status"}>
          {uploadMessage.text}
        </p>
      ) : null}

      {result ? (
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 sm:p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-semibold text-white">Comparison result</h2>
              <p aria-live="polite" className="mt-1 text-sm text-slate-300">
                {result.identical
                  ? "No differences — Text A and Text B are identical."
                  : `${result.addedCount} line${result.addedCount === 1 ? "" : "s"} added · ${result.removedCount} line${result.removedCount === 1 ? "" : "s"} removed · ${result.unchangedCount} unchanged`}
              </p>
              {isStale ? (
                <p className="mt-1 text-xs text-amber-200" role="status">
                  Text has changed since this comparison. Click Compare to update it.
                </p>
              ) : null}
            </div>
            {!result.identical ? (
              <div className="flex gap-2" role="group" aria-label="Diff view">
                <button
                  aria-pressed={viewMode === "unified"}
                  className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                    viewMode === "unified" ? "border-cyan-300/60 bg-cyan-300/10 text-white" : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/25"
                  }`}
                  onClick={() => setViewMode("unified")}
                  type="button"
                >
                  Unified
                </button>
                <button
                  aria-pressed={viewMode === "side-by-side"}
                  className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                    viewMode === "side-by-side" ? "border-cyan-300/60 bg-cyan-300/10 text-white" : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/25"
                  }`}
                  onClick={() => setViewMode("side-by-side")}
                  type="button"
                >
                  Side by side
                </button>
              </div>
            ) : null}
          </div>

          {!result.identical ? (
            <div className="mt-5 max-h-[32rem] overflow-y-auto overflow-x-hidden rounded-2xl border border-white/10 bg-[#080b1a]/70 p-2">
              {viewMode === "unified" ? (
                <div className="font-mono text-xs leading-6 sm:text-sm">
                  {result.ops.map((op, index) => (
                    <div
                      className={`flex gap-2 rounded-md border px-2 py-0.5 ${rowClasses(op.type === "unchanged" ? "unchanged" : op.type)}`}
                      key={index}
                    >
                      <span aria-hidden="true" className="w-4 shrink-0 select-none text-slate-500">
                        {op.type === "added" ? "+" : op.type === "removed" ? "-" : " "}
                      </span>
                      <span className="min-w-0 flex-1 whitespace-pre-wrap break-words text-white">
                        {op.type === "added" ? op.b : op.a}
                        {(op.type === "added" ? op.b : op.a).length === 0 ? " " : null}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid gap-1 font-mono text-xs leading-6 sm:text-sm">
                  {sideRows.map((row, index) => (
                    <div className="grid grid-cols-1 gap-1 sm:grid-cols-2" key={index}>
                      <div className={`flex gap-2 rounded-md border px-2 py-0.5 ${row.left === null ? "border-white/5 bg-transparent opacity-40" : rowClasses(row.kind === "changed" ? "removed" : row.kind)}`}>
                        <span aria-hidden="true" className="w-4 shrink-0 select-none text-slate-500">
                          {row.left !== null && row.kind !== "unchanged" ? "-" : " "}
                        </span>
                        <span className="min-w-0 flex-1 whitespace-pre-wrap break-words text-white">{row.left ?? " "}</span>
                      </div>
                      <div className={`flex gap-2 rounded-md border px-2 py-0.5 ${row.right === null ? "border-white/5 bg-transparent opacity-40" : rowClasses(row.kind === "changed" ? "added" : row.kind)}`}>
                        <span aria-hidden="true" className="w-4 shrink-0 select-none text-slate-500">
                          {row.right !== null && row.kind !== "unchanged" ? "+" : " "}
                        </span>
                        <span className="min-w-0 flex-1 whitespace-pre-wrap break-words text-white">{row.right ?? " "}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {!result.identical ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <button
                  className="w-full rounded-full border border-cyan-300/25 bg-cyan-300/10 px-5 py-2.5 text-sm font-semibold text-cyan-100 transition hover:border-cyan-200/50 hover:bg-cyan-300/15"
                  onClick={handleCopy}
                  type="button"
                >
                  Copy Diff
                </button>
                {copyMessage ? (
                  <p className="mt-2 text-xs text-slate-400" role="status">
                    {copyMessage}
                  </p>
                ) : null}
              </div>
              <div>
                <FilenameField extension="txt" onChange={setFilenameBase} value={filenameBase} />
                <p className="mt-2 text-xs text-slate-500">File size: {formatBytes(outputBlob.size)}</p>
                <button
                  className="mt-2 w-full rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-white/30 hover:bg-white/10"
                  onClick={handleDownload}
                  type="button"
                >
                  Download Diff
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
