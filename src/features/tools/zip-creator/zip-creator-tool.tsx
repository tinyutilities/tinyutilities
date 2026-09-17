"use client";

import { useMemo, useRef, useState } from "react";
import {
  buildDownloadFilename,
  ErrorCard,
  FilenameField,
  formatBytes,
  ProcessingState,
  SelectedFileRow,
  SuccessCard,
  UploadCard,
} from "@/components/upload";
import type { UploadPhase } from "@/components/upload";

/** fflate is only needed once the user actually clicks Create ZIP, so it's dynamically imported
 *  here rather than bundled with every tool page's initial JS — same lazy-load pattern already
 *  used by PDF Splitter, which added this dependency. */
function loadFflate() {
  return import("fflate");
}

type SelectedFile = {
  /** Stable per-selection id (not derived from the filename) so removal and duplicate-name
   *  handling both work correctly even when two selected files share the same name. */
  id: string;
  file: File;
};

type GeneratedZip = {
  blob: Blob;
  entryNames: string[];
};

const maxFileSize = 500 * 1024 * 1024;
const defaultFilenameBase = "TinyUtility-Archive";

function toArrayBuffer(bytes: Uint8Array) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.download = filename;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

function createId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Turns a file's name (or, for files dropped from a folder, its browser-provided relative path)
 * into a safe ZIP entry path: backslashes normalized to slashes, `.`/`..`/empty segments and
 * drive letters dropped, so nothing can escape the archive root or write an absolute path.
 * Ordinary filenames pass through completely unchanged.
 */
function sanitizeEntryPath(rawPath: string): string {
  const segments = rawPath
    .replace(/\\/g, "/")
    .split("/")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0 && segment !== "." && segment !== "..")
    .map((segment) => (/^[a-zA-Z]:$/.test(segment) ? "file" : segment));

  return segments.length > 0 ? segments.join("/") : "file";
}

/** Appends " (2)", " (3)", etc. before the extension until `path` no longer collides with
 *  anything already in `used`. Mutates `used` with the chosen name. */
function dedupeEntryPath(path: string, used: Set<string>): string {
  if (!used.has(path)) {
    used.add(path);
    return path;
  }

  const lastSlash = path.lastIndexOf("/");
  const dir = lastSlash >= 0 ? path.slice(0, lastSlash + 1) : "";
  const leaf = lastSlash >= 0 ? path.slice(lastSlash + 1) : path;
  const dotIndex = leaf.lastIndexOf(".");
  const base = dotIndex > 0 ? leaf.slice(0, dotIndex) : leaf;
  const extension = dotIndex > 0 ? leaf.slice(dotIndex) : "";

  let attempt = 2;
  let candidate = `${dir}${base} (${attempt})${extension}`;
  while (used.has(candidate)) {
    attempt += 1;
    candidate = `${dir}${base} (${attempt})${extension}`;
  }

  used.add(candidate);
  return candidate;
}

/** Computes the final, guaranteed-unique, path-safe ZIP entry name for every selected file, in
 *  selection order. This is the single source of truth used both for the "will be saved as"
 *  preview in the file list and for the actual archive written on Create ZIP. */
function buildEntryPaths(items: SelectedFile[]): string[] {
  const used = new Set<string>();

  return items.map((item) => {
    const rawPath = item.file.webkitRelativePath || item.file.name;
    return dedupeEntryPath(sanitizeEntryPath(rawPath), used);
  });
}

function fileTypeLabel(file: File) {
  if (!file.type) return "File";
  const [, subtype] = file.type.split("/");
  return (subtype || file.type).toUpperCase();
}

export function ZipCreatorTool() {
  const downloadedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [items, setItems] = useState<SelectedFile[]>([]);
  const [result, setResult] = useState<GeneratedZip | null>(null);
  const [filenameBase, setFilenameBase] = useState(defaultFilenameBase);
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [justDownloaded, setJustDownloaded] = useState(false);

  const isBusy = phase === "preparing" || phase === "processing";
  const showSuccessHero = phase === "completed" && result !== null;

  const entryPaths = useMemo(() => buildEntryPaths(items), [items]);
  const totalSize = useMemo(() => items.reduce((sum, item) => sum + item.file.size, 0), [items]);

  const addFiles = (fileList: FileList | File[]) => {
    const allFiles = Array.from(fileList);
    const validFiles = allFiles.filter((file) => file.size <= maxFileSize);
    const oversizedCount = allFiles.length - validFiles.length;

    setResult(null);

    if (validFiles.length === 0) {
      if (allFiles.length > 0) {
        setPhase("error");
        setErrorMessage(
          allFiles.length === 1
            ? "This file is larger than the 500 MB limit."
            : "These files are all larger than the 500 MB limit.",
        );
      }
      return;
    }

    if (phase === "error") setPhase("idle");
    setErrorMessage(null);
    setWarningMessage(
      oversizedCount > 0 ? `${oversizedCount} file${oversizedCount === 1 ? "" : "s"} over 500 MB ${oversizedCount === 1 ? "was" : "were"} skipped.` : null,
    );

    setItems((current) => [...current, ...validFiles.map((file) => ({ id: createId(), file }))]);
    setFilenameBase(defaultFilenameBase);
  };

  const removeFile = (id: string) => {
    setResult(null);
    setItems((current) => current.filter((item) => item.id !== id));
  };

  const clearAll = () => {
    if (downloadedTimeoutRef.current) clearTimeout(downloadedTimeoutRef.current);
    setItems([]);
    setResult(null);
    setPhase("idle");
    setErrorMessage(null);
    setWarningMessage(null);
    setJustDownloaded(false);
  };

  const backToFiles = () => {
    setResult(null);
    setPhase("idle");
    setJustDownloaded(false);
  };

  const createZip = async () => {
    if (items.length === 0) return;

    setPhase("processing");
    setErrorMessage(null);

    try {
      const fflate = await loadFflate();
      const paths = buildEntryPaths(items);
      const zipInput: Record<string, Uint8Array> = {};

      for (let i = 0; i < items.length; i += 1) {
        zipInput[paths[i]] = new Uint8Array(await items[i].file.arrayBuffer());
      }

      const zipped = await new Promise<Uint8Array>((resolve, reject) => {
        fflate.zip(zipInput, (error, data) => (error ? reject(error) : resolve(data)));
      });

      const blob = new Blob([toArrayBuffer(zipped)], { type: "application/zip" });

      setResult({ blob, entryNames: paths });
      setPhase("completed");
    } catch (error) {
      setPhase("error");
      setErrorMessage(
        error instanceof RangeError
          ? "These files are too large to zip together in this browser tab. Try fewer or smaller files."
          : "This ZIP could not be created. One of the files may be unreadable — try removing it and trying again.",
      );
    }
  };

  const markDownloaded = () => {
    setJustDownloaded(true);
    if (downloadedTimeoutRef.current) clearTimeout(downloadedTimeoutRef.current);
    downloadedTimeoutRef.current = setTimeout(() => setJustDownloaded(false), 3000);
  };

  const downloadZip = () => {
    if (!result) return;
    downloadBlob(result.blob, buildDownloadFilename(filenameBase, "zip", defaultFilenameBase));
    markDownloaded();
  };

  return (
    <section className="mt-16 space-y-6">
      <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-5 text-sm font-medium leading-6 text-cyan-100">
        Your files never leave your device. The ZIP is built entirely in your browser.
      </div>

      {showSuccessHero && result ? (
        <SuccessCard
          beforeActions={<FilenameField extension="zip" onChange={setFilenameBase} value={filenameBase} />}
          downloadLabel="Download ZIP"
          heroStat={{ label: "Files in ZIP", value: `${result.entryNames.length}` }}
          justDownloaded={justDownloaded}
          onDownload={downloadZip}
          onReset={clearAll}
          resetLabel="Create Another ZIP"
          stats={[
            { label: "Files", value: `${result.entryNames.length}` },
            { label: "ZIP size", value: formatBytes(result.blob.size) },
            { label: "Original size", value: formatBytes(totalSize) },
          ]}
          subtitle={`Packaged ${result.entryNames.length} file${result.entryNames.length === 1 ? "" : "s"} into one ZIP archive.`}
          title="ZIP Ready"
        >
          <button
            className="mx-auto block text-sm font-medium text-cyan-300 transition hover:text-cyan-100"
            onClick={backToFiles}
            type="button"
          >
            Back to files
          </button>
          <div className="mt-6 grid gap-2">
            {result.entryNames.map((name) => (
              <div
                className="truncate rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-300"
                key={name}
              >
                {name}
              </div>
            ))}
          </div>
        </SuccessCard>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 sm:p-8">
            {items.length === 0 ? (
              <UploadCard
                accept=""
                disabled={isBusy}
                formatsLabel="any file type"
                helperText="Up to 500 MB per file."
                multiple
                onFiles={addFiles}
              />
            ) : (
              <>
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">
                      {items.length} file{items.length === 1 ? "" : "s"} selected
                    </p>
                    <p className="mt-1 text-sm text-slate-400">Total {formatBytes(totalSize)}</p>
                  </div>
                  <button
                    className="shrink-0 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-white/30 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isBusy}
                    onClick={clearAll}
                    type="button"
                  >
                    Choose different files
                  </button>
                </div>

                <div className="mt-6">
                  <UploadCard
                    accept=""
                    compact
                    disabled={isBusy}
                    formatsLabel="any file type"
                    multiple
                    onFiles={addFiles}
                  />
                </div>

                {warningMessage ? (
                  <p className="mt-3 text-xs text-amber-200" role="status">
                    {warningMessage}
                  </p>
                ) : null}

                <div className="mt-6 grid gap-2">
                  {items.map((item, index) => {
                    const resolvedName = entryPaths[index];
                    const wasRenamed = resolvedName !== (item.file.webkitRelativePath || item.file.name);

                    return (
                      <SelectedFileRow
                        actions={
                          <button
                            aria-label={`Remove ${item.file.name}`}
                            className="rounded-full border border-red-300/25 px-3 py-2 text-xs font-semibold text-red-200 transition hover:border-red-200/50 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-300/50 disabled:cursor-not-allowed disabled:opacity-40"
                            disabled={isBusy}
                            onClick={() => removeFile(item.id)}
                            type="button"
                          >
                            Remove
                          </button>
                        }
                        detail={wasRenamed ? `Saved as ${resolvedName}` : undefined}
                        key={item.id}
                        name={item.file.name}
                        sizeLabel={formatBytes(item.file.size)}
                        typeLabel={fileTypeLabel(item.file)}
                      />
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 sm:p-8">
              <h2 className="text-lg font-semibold text-white">Create ZIP</h2>

              {items.length > 0 ? (
                <p className="mt-4 text-sm leading-6 text-slate-400">
                  {items.length} file{items.length === 1 ? "" : "s"} ({formatBytes(totalSize)}) will be
                  packaged into one ZIP archive.
                </p>
              ) : (
                <p className="mt-4 text-sm leading-6 text-slate-400">
                  Add files to package them into a ZIP archive.
                </p>
              )}

              <p className="mt-3 text-xs leading-5 text-slate-500">
                Some file types, such as JPG, PNG, and MP4, are already compressed and may not shrink
                much inside a ZIP.
              </p>

              <button
                className="mt-6 w-full rounded-full bg-gradient-to-r from-[#4F46E5] via-[#06B6D4] to-[#14B8A6] px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:shadow-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                disabled={items.length === 0 || isBusy}
                onClick={createZip}
                type="button"
              >
                {phase === "processing" ? "Creating ZIP..." : "Create ZIP"}
              </button>

              <div className="mt-5 space-y-3">
                {phase === "processing" ? (
                  <ProcessingState subtitle="Compressing files locally" title="Creating ZIP" />
                ) : null}
                {phase === "error" && errorMessage ? (
                  <ErrorCard message={errorMessage} title="Something went wrong" />
                ) : null}
              </div>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}
