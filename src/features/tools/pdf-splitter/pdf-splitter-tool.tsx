"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

/** pdf-lib is only needed once the user actually adds or splits a PDF, so it's dynamically
 *  imported here rather than bundled with every tool page's initial JS — same pattern already
 *  used by PDF Page Extractor and PDF Page Editor. */
function loadPdfLib() {
  return import("pdf-lib");
}

/** pdfjs-dist is only used to render the small page-preview thumbnails shown in the page grid —
 *  the actual split/export logic never touches it, it only ever uses pdf-lib. Same dynamic-import
 *  + self-hosted-worker pattern as PDF Page Extractor and PDF Page Editor, so nothing is fetched
 *  from a third-party CDN. */
async function loadPdfJs() {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  return pdfjsLib;
}

/** fflate packages the generated PDFs into a single ZIP so the user isn't forced to download
 *  many files one at a time. It's a tiny (a few KB gzipped), dependency-free, well-established
 *  browser-side compression library — not another PDF-processing library — and is dynamically
 *  imported so it only loads once a user actually clicks Split. */
function loadFflate() {
  return import("fflate");
}

/** Longest side, in CSS pixels, that a rendered thumbnail is allowed to be — same budget as
 *  PDF Page Extractor and PDF Page Editor. These only ever display at ~80px in the grid. */
const thumbnailMaxDimension = 220;

type PdfJsDocument = Awaited<ReturnType<Awaited<ReturnType<typeof loadPdfJs>>["getDocument"]>["promise"]>;

async function renderPageThumbnail(pdfDocument: PdfJsDocument, pageNumber: number, canvas: HTMLCanvasElement) {
  const page = await pdfDocument.getPage(pageNumber);

  try {
    const unscaledViewport = page.getViewport({ scale: 1 });
    const scale = thumbnailMaxDimension / Math.max(unscaledViewport.width, unscaledViewport.height);
    const viewport = page.getViewport({ scale });

    canvas.width = Math.max(1, Math.round(viewport.width));
    canvas.height = Math.max(1, Math.round(viewport.height));

    await page.render({ canvas, viewport }).promise;

    return canvas.toDataURL("image/jpeg", 0.72);
  } finally {
    page.cleanup();
  }
}

type PdfPageInfo = {
  /** 0-based, matches pdf-lib's page index. */
  index: number;
  width: number;
  height: number;
};

type LoadedPdf = {
  file: File;
  pageCount: number;
  pages: PdfPageInfo[];
};

type SplitMode = "ranges" | "everyN" | "breaks";

/** One output PDF, expressed as an inclusive 1-based page range. Always normalized to source-page
 *  order (see parseRanges below) — never the order the user typed groups in. */
type OutputGroup = {
  start: number;
  end: number;
};

type ParseResult = { ok: true; groups: OutputGroup[] } | { ok: false; error: string };

type GeneratedFile = {
  blob: Blob;
  group: OutputGroup;
};

type SplitResult = {
  files: GeneratedFile[];
  zipBlob: Blob;
};

const maxFileSize = 100 * 1024 * 1024;
const defaultFilenameBase = "TinyUtility-Split";

/** Restrained, cycling accent set used only to tell output groups apart at a glance in the page
 *  grid — not tied to any other state color elsewhere in the app (selection/success/error). */
const groupPalette = [
  { border: "border-cyan-300/60", badge: "bg-cyan-300" },
  { border: "border-violet-300/60", badge: "bg-violet-300" },
  { border: "border-teal-300/60", badge: "bg-teal-300" },
  { border: "border-amber-300/60", badge: "bg-amber-300" },
  { border: "border-rose-300/60", badge: "bg-rose-300" },
  { border: "border-sky-300/60", badge: "bg-sky-300" },
];

function toArrayBuffer(bytes: Uint8Array) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function isPdfFile(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function getPdfErrorMessage(error: unknown, pdfLib: Awaited<ReturnType<typeof loadPdfLib>>) {
  if (error instanceof pdfLib.EncryptedPDFError) {
    return "This PDF is password-protected. Remove the password and try again.";
  }

  return "This file couldn't be read. It may be corrupted or not a valid PDF.";
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.download = filename;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

function formatPageRange(group: OutputGroup) {
  return group.start === group.end ? `Page ${group.start}` : `Pages ${group.start}–${group.end}`;
}

function groupPageCount(group: OutputGroup) {
  return group.end - group.start + 1;
}

/** Validates that a set of candidate groups covers every source page exactly once, and returns
 *  them normalized to source-page order (never the order the user typed them in — see the note
 *  shown next to the range input). This is the single ownership check shared by every mode. */
function validateCoverage(groups: OutputGroup[], pageCount: number): ParseResult {
  const owner = new Array<number>(pageCount + 1).fill(-1);

  const sorted = [...groups].sort((a, b) => a.start - b.start);

  for (let groupIndex = 0; groupIndex < sorted.length; groupIndex += 1) {
    const { start, end } = sorted[groupIndex];

    for (let page = start; page <= end; page += 1) {
      if (owner[page] !== -1) {
        return { ok: false, error: `Page ${page} is included in more than one output group.` };
      }
      owner[page] = groupIndex;
    }
  }

  for (let page = 1; page <= pageCount; page += 1) {
    if (owner[page] === -1) {
      return {
        ok: false,
        error: `Page ${page} isn't included in any output group. Every page must belong to exactly one group.`,
      };
    }
  }

  return { ok: true, groups: sorted };
}

/**
 * Parses "1-3, 5, 7-9" style input into output groups. Never guesses past a clearly malformed
 * token — the first problem found is reported so the user can fix it immediately, rather than
 * silently producing surprising output.
 */
function parseRanges(input: string, pageCount: number): ParseResult {
  const tokens = input
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);

  if (tokens.length === 0) {
    return { ok: false, error: "Enter at least one page range, e.g. \"1-3, 4-6\"." };
  }

  const groups: OutputGroup[] = [];

  for (const token of tokens) {
    const singleMatch = token.match(/^(\d+)$/);
    const rangeMatch = token.match(/^(\d+)\s*-\s*(\d+)$/);

    if (!singleMatch && !rangeMatch) {
      return { ok: false, error: `"${token}" isn't a valid page or range. Use formats like "3" or "5-8".` };
    }

    const start = Number(singleMatch ? singleMatch[1] : rangeMatch![1]);
    const end = Number(singleMatch ? singleMatch[1] : rangeMatch![2]);

    if (start === 0 || end === 0) {
      return { ok: false, error: "Page 0 doesn't exist. Pages start at 1." };
    }

    if (start > end) {
      return { ok: false, error: `"${token}" is a reversed range. Did you mean "${end}-${start}"?` };
    }

    if (end > pageCount) {
      return { ok: false, error: `Page ${end} is out of range. This PDF has ${pageCount} page${pageCount === 1 ? "" : "s"}.` };
    }

    groups.push({ start, end });
  }

  return validateCoverage(groups, pageCount);
}

/** Splits every N pages into its own output, automatically covering the whole document — the
 *  last group is simply whatever is left over when the page count isn't evenly divisible. */
function parseEveryN(rawValue: string, pageCount: number): ParseResult {
  const n = Number(rawValue);

  if (!rawValue.trim() || !Number.isInteger(n) || n <= 0) {
    return { ok: false, error: "Enter a whole number of pages greater than 0." };
  }

  if (n > pageCount) {
    return { ok: false, error: `Split size can't be greater than the number of pages (${pageCount}).` };
  }

  const groups: OutputGroup[] = [];

  for (let start = 1; start <= pageCount; start += n) {
    groups.push({ start, end: Math.min(start + n - 1, pageCount) });
  }

  return { ok: true, groups };
}

/** Splits after each listed page number — "3, 7" on a 10-page PDF becomes 1-3, 4-7, 8-10. */
function parseBreaks(input: string, pageCount: number): ParseResult {
  const tokens = input
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);

  if (tokens.length === 0) {
    return { ok: false, error: "Enter at least one page number to split after, e.g. \"3, 7\"." };
  }

  const breaks = new Set<number>();

  for (const token of tokens) {
    const match = token.match(/^(\d+)$/);

    if (!match) {
      return { ok: false, error: `"${token}" isn't a valid page number.` };
    }

    const page = Number(match[1]);

    if (page < 1 || page >= pageCount) {
      return {
        ok: false,
        error:
          pageCount <= 1
            ? "This PDF only has one page, so there's nowhere to split it."
            : `Break points must be between 1 and ${pageCount - 1}.`,
      };
    }

    breaks.add(page);
  }

  const sortedBreaks = Array.from(breaks).sort((a, b) => a - b);
  const boundaries = [0, ...sortedBreaks, pageCount];
  const groups: OutputGroup[] = [];

  for (let i = 0; i < boundaries.length - 1; i += 1) {
    groups.push({ start: boundaries[i] + 1, end: boundaries[i + 1] });
  }

  return { ok: true, groups };
}

export function PdfSplitterTool() {
  const downloadedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const thumbnailRenderTokenRef = useRef(0);
  const [pdf, setPdf] = useState<LoadedPdf | null>(null);
  const [thumbnails, setThumbnails] = useState<(string | null)[]>([]);
  const [mode, setMode] = useState<SplitMode>("ranges");
  const [rangesInput, setRangesInput] = useState("");
  const [everyNInput, setEveryNInput] = useState("");
  const [breaksInput, setBreaksInput] = useState("");
  const [result, setResult] = useState<SplitResult | null>(null);
  const [filenameBase, setFilenameBase] = useState(defaultFilenameBase);
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [justDownloaded, setJustDownloaded] = useState(false);

  useEffect(() => {
    return () => {
      thumbnailRenderTokenRef.current += 1;
    };
  }, []);

  const isBusy = phase === "preparing" || phase === "processing";
  const showSuccessHero = phase === "completed" && result !== null;

  const parseResult: ParseResult | null = useMemo(() => {
    if (!pdf) return null;
    if (mode === "ranges") return parseRanges(rangesInput, pdf.pageCount);
    if (mode === "everyN") return parseEveryN(everyNInput, pdf.pageCount);
    return parseBreaks(breaksInput, pdf.pageCount);
  }, [pdf, mode, rangesInput, everyNInput, breaksInput]);

  const groups = parseResult?.ok ? parseResult.groups : null;

  /** Which output group (by index into `groups`) each 0-based page index belongs to, for
   *  tinting the page grid. Only computed once the configuration is fully valid. */
  const groupIndexByPage = useMemo(() => {
    if (!groups) return null;
    const map = new Map<number, number>();
    groups.forEach((group, groupIndex) => {
      for (let page = group.start; page <= group.end; page += 1) {
        map.set(page - 1, groupIndex);
      }
    });
    return map;
  }, [groups]);

  const revokeAllTimers = () => {
    if (downloadedTimeoutRef.current) clearTimeout(downloadedTimeoutRef.current);
  };

  /** Renders a low-res preview for every page, one at a time, reusing a single offscreen
   *  canvas — identical strategy to PDF Page Extractor and PDF Page Editor. */
  const generateThumbnails = async (file: File, pageCount: number, token: number) => {
    const pdfjsLib = await loadPdfJs();
    const bytes = new Uint8Array(await file.arrayBuffer());
    const loadingTask = pdfjsLib.getDocument({ data: bytes });

    let pdfDocument: Awaited<typeof loadingTask.promise>;

    try {
      pdfDocument = await loadingTask.promise;
    } catch {
      return;
    }

    if (token !== thumbnailRenderTokenRef.current) {
      void loadingTask.destroy();
      return;
    }

    const canvas = document.createElement("canvas");

    try {
      for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
        if (token !== thumbnailRenderTokenRef.current) return;

        try {
          const dataUrl = await renderPageThumbnail(pdfDocument, pageNumber, canvas);

          if (token !== thumbnailRenderTokenRef.current) return;

          setThumbnails((current) => {
            const next = current.slice();
            next[pageNumber - 1] = dataUrl;
            return next;
          });
        } catch {
          // Skip this page's thumbnail; the rest of the document keeps rendering.
        }
      }
    } finally {
      canvas.width = 0;
      canvas.height = 0;
      void loadingTask.destroy();
    }
  };

  const addFile = async (fileList: FileList | File[]) => {
    const file = Array.from(fileList)[0];

    setResult(null);
    setErrorMessage(null);

    if (!file) return;

    if (!isPdfFile(file)) {
      setPhase("error");
      setErrorMessage("Please choose a PDF file.");
      return;
    }

    if (file.size > maxFileSize) {
      setPhase("error");
      setErrorMessage("The PDF must be 100 MB or smaller.");
      return;
    }

    setPhase("preparing");

    const pdfLib = await loadPdfLib();

    try {
      const bytes = await file.arrayBuffer();
      const pdfDoc = await pdfLib.PDFDocument.load(bytes);
      const pageCount = pdfDoc.getPageCount();

      if (pageCount === 0) {
        setPhase("error");
        setErrorMessage("This PDF has no pages to split.");
        return;
      }

      const pages: PdfPageInfo[] = pdfDoc.getPages().map((page, index) => {
        const { width, height } = page.getSize();
        return { index, width, height };
      });

      setPdf({ file, pageCount, pages });
      setMode("ranges");
      setRangesInput("");
      setEveryNInput("");
      setBreaksInput("");
      setFilenameBase(defaultFilenameBase);
      setPhase("idle");

      thumbnailRenderTokenRef.current += 1;
      setThumbnails(new Array(pageCount).fill(null));
      void generateThumbnails(file, pageCount, thumbnailRenderTokenRef.current);
    } catch (error) {
      setPhase("error");
      setErrorMessage(getPdfErrorMessage(error, pdfLib));
    }
  };

  const clearAll = () => {
    revokeAllTimers();
    thumbnailRenderTokenRef.current += 1;
    setPdf(null);
    setThumbnails([]);
    setMode("ranges");
    setRangesInput("");
    setEveryNInput("");
    setBreaksInput("");
    setResult(null);
    setPhase("idle");
    setErrorMessage(null);
    setJustDownloaded(false);
  };

  const backToConfig = () => {
    setResult(null);
    setPhase("idle");
    setJustDownloaded(false);
  };

  const splitPdf = async () => {
    if (!pdf || !groups || groups.length === 0) return;

    setPhase("processing");
    setErrorMessage(null);

    const pdfLib = await loadPdfLib();

    try {
      const sourceBytes = await pdf.file.arrayBuffer();
      const sourceDoc = await pdfLib.PDFDocument.load(sourceBytes);

      const files: GeneratedFile[] = [];

      for (const group of groups) {
        const indices: number[] = [];
        for (let page = group.start; page <= group.end; page += 1) indices.push(page - 1);

        const newDoc = await pdfLib.PDFDocument.create();
        const copiedPages = await newDoc.copyPages(sourceDoc, indices);
        copiedPages.forEach((page) => newDoc.addPage(page));

        const outputBytes = await newDoc.save();
        const blob = new Blob([toArrayBuffer(outputBytes)], { type: "application/pdf" });

        files.push({ blob, group });
      }

      const fflate = await loadFflate();
      const zipEntries: Record<string, Uint8Array> = {};

      for (let i = 0; i < files.length; i += 1) {
        const name = buildDownloadFilename(`${filenameBase}-${i + 1}`, "pdf", defaultFilenameBase);
        zipEntries[name] = new Uint8Array(await files[i].blob.arrayBuffer());
      }

      const zipped = fflate.zipSync(zipEntries);
      const zipBlob = new Blob([toArrayBuffer(zipped)], { type: "application/zip" });

      setResult({ files, zipBlob });
      setPhase("completed");
    } catch (error) {
      setPhase("error");
      setErrorMessage(getPdfErrorMessage(error, pdfLib));
    }
  };

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

  const downloadFile = (file: GeneratedFile, position: number) => {
    downloadBlob(file.blob, buildDownloadFilename(`${filenameBase}-${position + 1}`, "pdf", defaultFilenameBase));
  };

  const modeButtons: { id: SplitMode; label: string }[] = [
    { id: "ranges", label: "Page ranges" },
    { id: "everyN", label: "Split every N pages" },
    { id: "breaks", label: "Split at page breaks" },
  ];

  return (
    <section className="mt-16 space-y-6">
      <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-5 text-sm font-medium leading-6 text-cyan-100">
        Your PDF never leaves your device. It&apos;s split into new PDFs entirely in your browser.
      </div>

      {showSuccessHero && result ? (
        <SuccessCard
          beforeActions={<FilenameField extension="zip" onChange={setFilenameBase} value={filenameBase} />}
          downloadLabel="Download ZIP"
          heroStat={{ label: "PDF files created", value: `${result.files.length}` }}
          justDownloaded={justDownloaded}
          onDownload={downloadZip}
          onReset={clearAll}
          resetLabel="Split Another PDF"
          stats={[
            { label: "Original pages", value: `${pdf?.pageCount ?? "—"}` },
            { label: "Output files", value: `${result.files.length}` },
            { label: "ZIP size", value: formatBytes(result.zipBlob.size) },
          ]}
          subtitle={`Created ${result.files.length} PDF${result.files.length === 1 ? "" : "s"}, packaged into one ZIP file.`}
          title="PDFs Ready"
        >
          <button
            className="mx-auto block text-sm font-medium text-cyan-300 transition hover:text-cyan-100"
            onClick={backToConfig}
            type="button"
          >
            Change split settings
          </button>
          <div className="mt-6 grid gap-3">
            {result.files.map((file, position) => (
              <SelectedFileRow
                actions={
                  <button
                    className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-4 py-2 text-xs font-semibold text-cyan-100 transition hover:border-cyan-200/50 hover:bg-cyan-300/15"
                    onClick={() => downloadFile(file, position)}
                    type="button"
                  >
                    Download
                  </button>
                }
                detail={`${formatPageRange(file.group)} · ${groupPageCount(file.group)} page${groupPageCount(file.group) === 1 ? "" : "s"}`}
                key={`${file.group.start}-${file.group.end}`}
                name={buildDownloadFilename(`${filenameBase}-${position + 1}`, "pdf", defaultFilenameBase)}
                sizeLabel={formatBytes(file.blob.size)}
                typeLabel="PDF"
              />
            ))}
          </div>
        </SuccessCard>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 sm:p-8">
            {!pdf ? (
              <UploadCard
                accept="application/pdf"
                disabled={isBusy}
                formatsLabel="PDF"
                helperText="Maximum 100 MB. One PDF at a time."
                onFiles={(files) => void addFile(files)}
              />
            ) : (
              <>
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{pdf.file.name}</p>
                    <p className="mt-1 text-sm text-slate-400">
                      {pdf.pageCount} page{pdf.pageCount === 1 ? "" : "s"} · {formatBytes(pdf.file.size)}
                    </p>
                  </div>
                  <button
                    className="shrink-0 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-white/30 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isBusy}
                    onClick={clearAll}
                    type="button"
                  >
                    Choose a different PDF
                  </button>
                </div>

                <div
                  aria-label="PDF pages"
                  className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5"
                  role="group"
                >
                  {pdf.pages.map((page) => {
                    const pageNumber = page.index + 1;
                    const groupIndex = groupIndexByPage?.get(page.index);
                    const palette = groupIndex !== undefined ? groupPalette[groupIndex % groupPalette.length] : null;

                    return (
                      <div
                        aria-label={
                          palette
                            ? `Page ${pageNumber}, in output ${(groupIndex ?? 0) + 1}`
                            : `Page ${pageNumber}`
                        }
                        className={`flex flex-col items-center rounded-xl border p-2 transition ${
                          palette ? palette.border : "border-white/10"
                        } bg-white/[0.03]`}
                        key={page.index}
                      >
                        <span
                          className="relative flex w-full max-w-20 items-center justify-center overflow-hidden rounded-md border border-white/10 bg-white/5"
                          style={{ aspectRatio: `${page.width} / ${page.height}` }}
                        >
                          {thumbnails[page.index] ? (
                            // Short-lived client-rendered data: URL thumbnail, not a next/image-eligible asset.
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              alt=""
                              aria-hidden="true"
                              className="size-full object-cover"
                              src={thumbnails[page.index] ?? undefined}
                            />
                          ) : (
                            <svg
                              aria-hidden="true"
                              className="size-5 fill-none stroke-current stroke-[1.5] text-slate-500"
                              viewBox="0 0 24 24"
                            >
                              <path d="M7 3h7l4 4v14H7z" strokeLinejoin="round" />
                              <path d="M14 3v5h4" strokeLinejoin="round" />
                            </svg>
                          )}
                          {palette ? (
                            <span
                              className={`absolute right-1 top-1 grid size-5 place-items-center rounded-full text-[10px] font-bold text-[#060816] ${palette.badge}`}
                            >
                              {(groupIndex ?? 0) + 1}
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-2 text-xs font-semibold text-slate-400">{pageNumber}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 sm:p-8">
              <h2 className="text-lg font-semibold text-white">Split settings</h2>

              {pdf ? (
                <>
                  <div className="mt-5 grid gap-2" role="tablist" aria-label="Split mode">
                    {modeButtons.map((option) => (
                      <button
                        aria-selected={mode === option.id}
                        className={`rounded-xl border px-4 py-2.5 text-left text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                          mode === option.id
                            ? "border-cyan-300/60 bg-cyan-300/10 text-white"
                            : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/25"
                        }`}
                        disabled={isBusy}
                        key={option.id}
                        onClick={() => setMode(option.id)}
                        role="tab"
                        type="button"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>

                  <div className="mt-5">
                    {mode === "ranges" ? (
                      <label className="block" htmlFor="ranges-input">
                        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Page ranges (comma-separated groups)
                        </span>
                        <input
                          className="mt-2 w-full rounded-xl border border-white/10 bg-[#080b1a] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/20"
                          disabled={isBusy}
                          id="ranges-input"
                          onChange={(event) => setRangesInput(event.target.value)}
                          placeholder="1-3, 4-6, 7-10"
                          type="text"
                          value={rangesInput}
                        />
                        <p className="mt-2 text-xs leading-5 text-slate-500">
                          Each comma-separated group becomes its own PDF. Every page must belong to exactly one
                          group, listed here in any order — outputs are always numbered by page order.
                        </p>
                      </label>
                    ) : mode === "everyN" ? (
                      <label className="block" htmlFor="every-n-input">
                        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Split every
                        </span>
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            className="w-24 rounded-xl border border-white/10 bg-[#080b1a] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/20"
                            disabled={isBusy}
                            id="every-n-input"
                            inputMode="numeric"
                            min={1}
                            onChange={(event) => setEveryNInput(event.target.value)}
                            type="number"
                            value={everyNInput}
                          />
                          <span className="text-sm text-slate-300">pages</span>
                        </div>
                      </label>
                    ) : (
                      <label className="block" htmlFor="breaks-input">
                        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Split after pages
                        </span>
                        <input
                          className="mt-2 w-full rounded-xl border border-white/10 bg-[#080b1a] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/20"
                          disabled={isBusy}
                          id="breaks-input"
                          onChange={(event) => setBreaksInput(event.target.value)}
                          placeholder="3, 7"
                          type="text"
                          value={breaksInput}
                        />
                        <p className="mt-2 text-xs leading-5 text-slate-500">
                          A new PDF starts right after each page number you list here.
                        </p>
                      </label>
                    )}
                  </div>

                  {parseResult && !parseResult.ok ? (
                    <p className="mt-3 text-xs text-amber-200" role="alert">
                      {parseResult.error}
                    </p>
                  ) : null}

                  {groups && groups.length > 0 ? (
                    <div className="mt-5 space-y-2">
                      <p className="text-sm font-semibold text-white">
                        {groups.length} PDF file{groups.length === 1 ? "" : "s"} will be created.
                      </p>
                      <div className="grid gap-2">
                        {groups.map((group, groupIndex) => {
                          const palette = groupPalette[groupIndex % groupPalette.length];
                          return (
                            <div
                              className={`flex items-center justify-between gap-3 rounded-xl border bg-[#080b1a]/70 px-3 py-2 text-sm ${palette.border}`}
                              key={`${group.start}-${group.end}`}
                            >
                              <span className="flex items-center gap-2 text-slate-200">
                                <span className={`size-2 shrink-0 rounded-full ${palette.badge}`} />
                                Output {groupIndex + 1} · {formatPageRange(group)}
                              </span>
                              <span className="shrink-0 text-xs text-slate-400">
                                {groupPageCount(group)} page{groupPageCount(group) === 1 ? "" : "s"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="mt-4 text-sm leading-6 text-slate-400">Add a PDF to choose how to split it.</p>
              )}

              <button
                className="mt-6 w-full rounded-full bg-gradient-to-r from-[#4F46E5] via-[#06B6D4] to-[#14B8A6] px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:shadow-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                disabled={!pdf || !groups || groups.length === 0 || isBusy}
                onClick={splitPdf}
                type="button"
              >
                {phase === "processing" ? "Splitting..." : "Split PDF"}
              </button>

              <div className="mt-5 space-y-3">
                {phase === "preparing" ? <ProcessingState subtitle="Reading your PDF" title="Preparing" /> : null}
                {phase === "processing" ? (
                  <ProcessingState subtitle="Creating and zipping your PDFs locally" title="Splitting" />
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
