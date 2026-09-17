"use client";

import { useMemo, useRef, useState } from "react";
import {
  buildDownloadFilename,
  ErrorCard,
  FilenameField,
  formatBytes,
  ProcessingState,
  SuccessCard,
  UploadCard,
} from "@/components/upload";
import type { UploadPhase } from "@/components/upload";

/** fflate is only needed once the user actually adds or extracts a ZIP, so it's dynamically
 *  imported here rather than bundled with every tool page's initial JS — same lazy-load pattern
 *  already used by PDF Splitter and ZIP Creator, which is where this dependency came from. */
function loadFflate() {
  return import("fflate");
}

type FflateModule = Awaited<ReturnType<typeof loadFflate>>;

const maxFileSize = 500 * 1024 * 1024;
const defaultFilenameBase = "TinyUtility-Extracted";

/** Safety ceilings for extraction, checked from the archive's own reported uncompressed sizes
 *  (never just the uploaded ZIP's file size — a small ZIP can expand enormously). Both are
 *  generous for an ordinary ZIP but bounded, to avoid a crafted archive exhausting this browser
 *  tab's memory. Checked during inspection, before anything is actually decompressed. */
const maxTotalUncompressedSize = 1024 * 1024 * 1024; // 1 GiB
const maxEntryCount = 10000;

function toArrayBuffer(bytes: Uint8Array) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function isZipFile(file: File) {
  const type = file.type.toLowerCase();
  return (
    type === "application/zip" ||
    type === "application/x-zip-compressed" ||
    type === "application/zip-compressed" ||
    file.name.toLowerCase().endsWith(".zip")
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.download = filename;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Turns a raw archive entry path into a safe relative path: backslashes normalized to slashes,
 * `.`/`..`/empty segments and bare drive letters dropped — so `../../secret.txt` becomes
 * `secret.txt` rather than being able to reference anything outside the archive, while an
 * ordinary `documents/report.pdf` passes through unchanged. Same approach as ZIP Creator uses
 * for entries going INTO a ZIP, applied here to entries coming OUT of one.
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

function basename(path: string) {
  const lastSlash = path.lastIndexOf("/");
  return lastSlash >= 0 ? path.slice(lastSlash + 1) : path;
}

const EOCD_SIGNATURE = [0x50, 0x4b, 0x05, 0x06];
const CENTRAL_DIR_SIGNATURE = 0x02014b50;

/**
 * fflate has no built-in handling for encrypted ZIP entries — it isn't designed to decrypt them,
 * and will simply fail (or produce garbage) if asked to. Detecting encryption ourselves, so we
 * can fail with a clear, specific message instead of a confusing generic one, requires reading
 * the general-purpose bit flag from the ZIP's own central directory (bit 0 = encrypted) — this
 * walks that directory using only the standard ZIP End-Of-Central-Directory + central file
 * header layout, entirely locally, and never decompresses anything.
 */
function findEncryptedEntryNames(bytes: Uint8Array): string[] {
  try {
    const maxCommentLength = 65535;
    const minOffset = Math.max(0, bytes.length - 22 - maxCommentLength);
    let eocdOffset = -1;

    for (let i = bytes.length - 22; i >= minOffset; i -= 1) {
      if (
        bytes[i] === EOCD_SIGNATURE[0] &&
        bytes[i + 1] === EOCD_SIGNATURE[1] &&
        bytes[i + 2] === EOCD_SIGNATURE[2] &&
        bytes[i + 3] === EOCD_SIGNATURE[3]
      ) {
        eocdOffset = i;
        break;
      }
    }

    if (eocdOffset === -1) return [];

    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const totalEntries = view.getUint16(eocdOffset + 10, true);
    let offset = view.getUint32(eocdOffset + 16, true);

    const decoder = new TextDecoder();
    const encryptedNames: string[] = [];

    for (let i = 0; i < totalEntries; i += 1) {
      if (offset + 46 > bytes.length || view.getUint32(offset, true) !== CENTRAL_DIR_SIGNATURE) break;

      const generalPurposeFlag = view.getUint16(offset + 8, true);
      const filenameLength = view.getUint16(offset + 28, true);
      const extraLength = view.getUint16(offset + 30, true);
      const commentLength = view.getUint16(offset + 32, true);

      if ((generalPurposeFlag & 0x1) !== 0) {
        encryptedNames.push(decoder.decode(bytes.slice(offset + 46, offset + 46 + filenameLength)));
      }

      offset += 46 + filenameLength + extraLength + commentLength;
    }

    return encryptedNames;
  } catch {
    // If the archive is too malformed for this scan, let fflate's own parsing surface the error.
    return [];
  }
}

type ZipFileEntry = {
  /** Sanitized, guaranteed-unique path — what's shown in the UI and used for the regenerated ZIP. */
  path: string;
  /** The exact path as stored in the archive, needed to match fflate's unzip output back to it. */
  originalPath: string;
  size: number;
};

type LoadedZip = {
  file: File;
  fileEntries: ZipFileEntry[];
  totalUncompressedSize: number;
  hasDuplicateRawNames: boolean;
};

type ExtractedFile = {
  path: string;
  size: number;
  bytes: Uint8Array;
};

type ExtractResult = {
  zipBlob: Blob;
  files: ExtractedFile[];
};

class EncryptedZipError extends Error {}
class ArchiveTooLargeError extends Error {}

/** Lists every file entry in the archive (name + real uncompressed size) without decompressing
 *  any of it — the filter fflate calls per-entry always returns false, so nothing is inflated.
 *  Directory entries (paths ending in "/") are counted for the size/entry-count safety check but
 *  excluded from the returned file list, since they're not downloadable content. */
async function inspectZip(fflate: FflateModule, bytes: Uint8Array) {
  const encryptedNames = findEncryptedEntryNames(bytes);
  if (encryptedNames.length > 0) {
    throw new EncryptedZipError();
  }

  const rawEntries: { name: string; size: number; isDirectory: boolean }[] = [];
  let totalUncompressedSize = 0;

  fflate.unzipSync(bytes, {
    filter(entry) {
      const isDirectory = entry.name.endsWith("/");
      rawEntries.push({ name: entry.name, size: entry.originalSize, isDirectory });
      if (!isDirectory) totalUncompressedSize += entry.originalSize;
      return false;
    },
  });

  if (rawEntries.length > maxEntryCount || totalUncompressedSize > maxTotalUncompressedSize) {
    throw new ArchiveTooLargeError();
  }

  const used = new Set<string>();
  const fileEntries: ZipFileEntry[] = rawEntries
    .filter((entry) => !entry.isDirectory)
    .map((entry) => ({
      originalPath: entry.name,
      path: dedupeEntryPath(sanitizeEntryPath(entry.name), used),
      size: entry.size,
    }));

  const hasDuplicateRawNames = new Set(rawEntries.map((entry) => entry.name)).size !== rawEntries.length;

  return { fileEntries, totalUncompressedSize, hasDuplicateRawNames };
}

function getZipErrorMessage(error: unknown) {
  if (error instanceof EncryptedZipError) {
    return "This ZIP is password-protected. Password-protected ZIPs aren't currently supported.";
  }
  if (error instanceof ArchiveTooLargeError) {
    return "This archive is too large to extract safely in a browser tab (over 1 GB uncompressed, or more than 10,000 files).";
  }
  return "This file couldn't be read. It may be corrupted or not a valid ZIP archive.";
}

export function ZipExtractorTool() {
  const downloadedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [zip, setZip] = useState<LoadedZip | null>(null);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<ExtractResult | null>(null);
  const [filenameBase, setFilenameBase] = useState(defaultFilenameBase);
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [justDownloaded, setJustDownloaded] = useState(false);

  const isBusy = phase === "preparing" || phase === "processing";
  const showSuccessHero = phase === "completed" && result !== null;
  const selectedCount = selectedPaths.size;
  const selectedTotalSize = useMemo(
    () => (zip ? zip.fileEntries.filter((entry) => selectedPaths.has(entry.path)).reduce((sum, e) => sum + e.size, 0) : 0),
    [zip, selectedPaths],
  );

  const togglePath = (path: string) => {
    setSelectedPaths((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const selectAll = () => {
    if (!zip) return;
    setSelectedPaths(new Set(zip.fileEntries.map((entry) => entry.path)));
  };

  const clearSelection = () => setSelectedPaths(new Set());

  const addFile = async (fileList: FileList | File[]) => {
    const file = Array.from(fileList)[0];

    setResult(null);
    setErrorMessage(null);

    if (!file) return;

    if (!isZipFile(file)) {
      setPhase("error");
      setErrorMessage("Please choose a ZIP file.");
      return;
    }

    if (file.size > maxFileSize) {
      setPhase("error");
      setErrorMessage("The ZIP must be 500 MB or smaller.");
      return;
    }

    setPhase("preparing");

    try {
      const fflate = await loadFflate();
      const bytes = new Uint8Array(await file.arrayBuffer());
      const { fileEntries, totalUncompressedSize, hasDuplicateRawNames } = await inspectZip(fflate, bytes);

      if (fileEntries.length === 0) {
        setPhase("error");
        setErrorMessage("Your ZIP doesn't contain any files to extract.");
        return;
      }

      setZip({ file, fileEntries, totalUncompressedSize, hasDuplicateRawNames });
      setSelectedPaths(fileEntries.length <= 200 ? new Set(fileEntries.map((entry) => entry.path)) : new Set());
      setFilenameBase(defaultFilenameBase);
      setPhase("idle");
    } catch (error) {
      setPhase("error");
      setErrorMessage(getZipErrorMessage(error));
    }
  };

  const clearAll = () => {
    if (downloadedTimeoutRef.current) clearTimeout(downloadedTimeoutRef.current);
    setZip(null);
    setSelectedPaths(new Set());
    setResult(null);
    setPhase("idle");
    setErrorMessage(null);
    setJustDownloaded(false);
  };

  const backToArchive = () => {
    setResult(null);
    setPhase("idle");
    setJustDownloaded(false);
  };

  const extractPaths = async (paths: string[]) => {
    if (!zip || paths.length === 0) return;

    setPhase("processing");
    setErrorMessage(null);

    try {
      const fflate = await loadFflate();
      const bytes = new Uint8Array(await zip.file.arrayBuffer());
      const pathSet = new Set(paths);
      const wantedOriginalPaths = new Set(
        zip.fileEntries.filter((entry) => pathSet.has(entry.path)).map((entry) => entry.originalPath),
      );

      const unzipped = await new Promise<Record<string, Uint8Array>>((resolve, reject) => {
        fflate.unzip(bytes, { filter: (entry) => wantedOriginalPaths.has(entry.name) }, (error, data) =>
          error ? reject(error) : resolve(data),
        );
      });

      const files: ExtractedFile[] = zip.fileEntries
        .filter((entry) => pathSet.has(entry.path))
        .map((entry) => ({ path: entry.path, size: entry.size, bytes: unzipped[entry.originalPath] }))
        .filter((entry): entry is ExtractedFile => Boolean(entry.bytes));

      const zipEntries: Record<string, Uint8Array> = {};
      files.forEach((entry) => {
        zipEntries[entry.path] = entry.bytes;
      });

      const zipped = await new Promise<Uint8Array>((resolve, reject) => {
        fflate.zip(zipEntries, (error, data) => (error ? reject(error) : resolve(data)));
      });

      const zipBlob = new Blob([toArrayBuffer(zipped)], { type: "application/zip" });

      setResult({ zipBlob, files });
      setPhase("completed");
    } catch (error) {
      setPhase("error");
      setErrorMessage(getZipErrorMessage(error));
    }
  };

  const extractAll = () => zip && void extractPaths(zip.fileEntries.map((entry) => entry.path));
  const extractSelected = () => void extractPaths(Array.from(selectedPaths));

  const markDownloaded = () => {
    setJustDownloaded(true);
    if (downloadedTimeoutRef.current) clearTimeout(downloadedTimeoutRef.current);
    downloadedTimeoutRef.current = setTimeout(() => setJustDownloaded(false), 3000);
  };

  const downloadZip = () => {
    if (!result) return;
    downloadBlob(result.zipBlob, buildDownloadFilename(filenameBase, "zip", defaultFilenameBase));
    markDownloaded();
  };

  const downloadFile = (file: ExtractedFile) => {
    const blob = new Blob([toArrayBuffer(file.bytes)], { type: "application/octet-stream" });
    downloadBlob(blob, basename(file.path));
  };

  const resultTotalSize = result ? result.files.reduce((sum, f) => sum + f.size, 0) : 0;

  return (
    <section className="mt-16 space-y-6">
      <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-5 text-sm font-medium leading-6 text-cyan-100">
        Your ZIP never leaves your device. It&apos;s inspected and extracted entirely in your browser.
      </div>

      {showSuccessHero && result ? (
        <SuccessCard
          beforeActions={<FilenameField extension="zip" onChange={setFilenameBase} value={filenameBase} />}
          downloadLabel="Download ZIP"
          heroStat={{ label: "Files extracted", value: `${result.files.length}` }}
          justDownloaded={justDownloaded}
          onDownload={downloadZip}
          onReset={clearAll}
          resetLabel="Choose Different ZIP"
          stats={[
            { label: "Files extracted", value: `${result.files.length}` },
            { label: "Total size", value: formatBytes(resultTotalSize) },
            { label: "ZIP size", value: formatBytes(result.zipBlob.size) },
          ]}
          subtitle={`Extracted ${result.files.length} file${result.files.length === 1 ? "" : "s"} from the archive.`}
          title="Extraction Complete"
        >
          <button
            className="mx-auto block text-sm font-medium text-cyan-300 transition hover:text-cyan-100"
            onClick={backToArchive}
            type="button"
          >
            Back to archive
          </button>
          <div className="mt-6 grid gap-2">
            {result.files.map((file) => (
              <div
                className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs"
                key={file.path}
              >
                <span className="min-w-0 truncate text-slate-300" title={file.path}>
                  {file.path}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="text-slate-500">{formatBytes(file.size)}</span>
                  <button
                    className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-[11px] font-semibold text-cyan-100 transition hover:border-cyan-200/50 hover:bg-cyan-300/15"
                    onClick={() => downloadFile(file)}
                    type="button"
                  >
                    Download
                  </button>
                </span>
              </div>
            ))}
          </div>
        </SuccessCard>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 sm:p-8">
            {!zip ? (
              <UploadCard
                accept=".zip,application/zip,application/x-zip-compressed"
                disabled={isBusy}
                formatsLabel="ZIP"
                helperText="Maximum 500 MB."
                onFiles={(files) => void addFile(files)}
              />
            ) : (
              <>
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{zip.file.name}</p>
                    <p className="mt-1 text-sm text-slate-400">
                      {zip.fileEntries.length} file{zip.fileEntries.length === 1 ? "" : "s"} ·{" "}
                      {formatBytes(zip.totalUncompressedSize)} uncompressed
                    </p>
                  </div>
                  <button
                    className="shrink-0 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-white/30 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isBusy}
                    onClick={clearAll}
                    type="button"
                  >
                    Choose a different ZIP
                  </button>
                </div>

                {zip.hasDuplicateRawNames ? (
                  <p className="mt-3 text-xs text-amber-200" role="status">
                    This archive lists more than one entry with the exact same internal path — only the
                    last one for each duplicate could be recovered.
                  </p>
                ) : null}

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2" role="group" aria-label="Selection shortcuts">
                    <button
                      className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-violet-300/40 hover:text-white"
                      disabled={isBusy}
                      onClick={selectAll}
                      type="button"
                    >
                      Select All
                    </button>
                    <button
                      className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-violet-300/40 hover:text-white"
                      disabled={isBusy}
                      onClick={clearSelection}
                      type="button"
                    >
                      Clear Selection
                    </button>
                  </div>
                  <p aria-live="polite" className="text-sm font-semibold text-violet-200">
                    {selectedCount} of {zip.fileEntries.length} selected
                  </p>
                </div>

                <div className="mt-5 grid gap-2">
                  {zip.fileEntries.map((entry) => {
                    const isSelected = selectedPaths.has(entry.path);
                    return (
                      <label
                        className={`flex min-w-0 cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                          isSelected
                            ? "border-violet-300/60 bg-violet-400/10"
                            : "border-white/10 bg-white/[0.03] hover:border-white/25"
                        } ${isBusy ? "pointer-events-none opacity-60" : ""}`}
                        key={entry.path}
                      >
                        <input
                          checked={isSelected}
                          className="size-4 shrink-0 accent-violet-400"
                          disabled={isBusy}
                          onChange={() => togglePath(entry.path)}
                          type="checkbox"
                        />
                        <span className="min-w-0 flex-1 truncate text-sm text-white" title={entry.path}>
                          {entry.path}
                        </span>
                        <span className="shrink-0 text-xs text-slate-400">{formatBytes(entry.size)}</span>
                      </label>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 sm:p-8">
              <h2 className="text-lg font-semibold text-white">Extract files</h2>

              {zip ? (
                <p className="mt-4 text-sm leading-6 text-slate-400">
                  {selectedCount > 0
                    ? `${selectedCount} file${selectedCount === 1 ? "" : "s"} selected (${formatBytes(selectedTotalSize)}).`
                    : "Select files, or extract everything."}
                </p>
              ) : (
                <p className="mt-4 text-sm leading-6 text-slate-400">Add a ZIP to see what&apos;s inside it.</p>
              )}

              <button
                className="mt-6 w-full rounded-full bg-gradient-to-r from-[#4F46E5] via-[#06B6D4] to-[#14B8A6] px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:shadow-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                disabled={!zip || isBusy}
                onClick={extractAll}
                type="button"
              >
                {phase === "processing" ? "Extracting..." : "Extract All"}
              </button>
              <button
                className="mt-3 w-full rounded-full border border-violet-300/40 bg-violet-400/10 px-6 py-3 text-sm font-semibold text-violet-100 transition hover:border-violet-200/60 hover:bg-violet-400/15 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!zip || selectedCount === 0 || isBusy}
                onClick={extractSelected}
                type="button"
              >
                Extract Selected
              </button>

              <div className="mt-5 space-y-3">
                {phase === "preparing" ? <ProcessingState subtitle="Reading your ZIP" title="Preparing" /> : null}
                {phase === "processing" ? (
                  <ProcessingState subtitle="Extracting files locally" title="Extracting" />
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
