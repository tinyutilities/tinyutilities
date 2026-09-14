"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

/** pdf-lib is only needed once the user actually adds or extracts pages, so it's dynamically
 *  imported here rather than bundled with every tool page's initial JS — same pattern already
 *  used by PDF Compressor and PDF Merger. */
function loadPdfLib() {
  return import("pdf-lib");
}

/** pdfjs-dist is only used to render the small page-preview thumbnails shown in the selection
 *  grid — the actual page-selection/extraction logic never touches it, it only ever uses
 *  pdf-lib. Dynamically imported for the same reason as pdf-lib above: no reason to ship it in
 *  every tool page's initial JS. The worker script is self-hosted from /pdf.worker.min.mjs
 *  (copied from the pdfjs-dist package) so nothing is fetched from a third-party CDN. */
async function loadPdfJs() {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  return pdfjsLib;
}

/** Longest side, in CSS pixels, that a rendered thumbnail is allowed to be. Small on purpose —
 *  these only ever display at ~80px in the grid, so this leaves headroom for retina screens
 *  without rendering pages at anything close to full resolution. */
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

type ExtractResult = {
  blob: Blob;
  pageCount: number;
};

const maxFileSize = 100 * 1024 * 1024;

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

/**
 * Parses a page-range string like "1, 3, 5-8, 12" into the set of valid 1-based page numbers it
 * describes. Never throws — malformed tokens are simply skipped and reported back so the UI can
 * show what was ignored, rather than failing the whole input over one typo.
 */
function parsePageRangeInput(input: string, pageCount: number) {
  const tokens = input
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);
  const pages = new Set<number>();
  const invalidTokens: string[] = [];

  for (const token of tokens) {
    const rangeMatch = token.match(/^(\d+)\s*-\s*(\d+)$/);
    const singleMatch = token.match(/^(\d+)$/);

    if (rangeMatch) {
      let start = Number(rangeMatch[1]);
      let end = Number(rangeMatch[2]);

      if (start > end) {
        [start, end] = [end, start];
      }

      if (start < 1 || end > pageCount) {
        invalidTokens.push(token);
      }

      for (let page = Math.max(1, start); page <= Math.min(pageCount, end); page += 1) {
        pages.add(page);
      }
    } else if (singleMatch) {
      const page = Number(singleMatch[1]);

      if (page >= 1 && page <= pageCount) {
        pages.add(page);
      } else {
        invalidTokens.push(token);
      }
    } else {
      invalidTokens.push(token);
    }
  }

  return {
    pages: Array.from(pages).sort((a, b) => a - b),
    invalidTokens,
  };
}

export function PdfPageExtractorTool() {
  const objectUrlRef = useRef<string | null>(null);
  const downloadedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const thumbnailRenderTokenRef = useRef(0);
  const [pdf, setPdf] = useState<LoadedPdf | null>(null);
  const [thumbnails, setThumbnails] = useState<(string | null)[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [rangeInput, setRangeInput] = useState("");
  const [rangeNotice, setRangeNotice] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractResult | null>(null);
  const [filenameBase, setFilenameBase] = useState("TinyUtility");
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
  const selectedCount = selectedIndices.size;
  const selectedLabel = selectedCount === 1 ? "1 page selected" : `${selectedCount} pages selected`;

  const sortedSelectedIndices = useMemo(
    () => Array.from(selectedIndices).sort((a, b) => a - b),
    [selectedIndices],
  );

  const revokeResultUrl = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  };

  /** Renders a low-res preview for every page, one at a time, reusing a single offscreen
   *  canvas so memory never holds more than one rendered page at a time. Thumbnails are
   *  stored as small JPEG data URLs (no object URLs to track/revoke) and pages update the
   *  grid progressively as each one finishes rather than blocking on the whole document.
   *  Purely cosmetic: if it fails partway (or fails entirely), the affected pages just keep
   *  showing the icon placeholder — extraction itself never depends on this. */
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

  const togglePage = (index: number) => {
    setSelectedIndices((current) => {
      const next = new Set(current);

      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }

      return next;
    });
  };

  const selectAll = () => {
    if (!pdf) return;
    setSelectedIndices(new Set(pdf.pages.map((page) => page.index)));
  };

  const clearSelection = () => {
    setSelectedIndices(new Set());
  };

  const invertSelection = () => {
    if (!pdf) return;
    setSelectedIndices((current) => {
      const next = new Set<number>();
      for (const page of pdf.pages) {
        if (!current.has(page.index)) next.add(page.index);
      }
      return next;
    });
  };

  const applyRangeInput = () => {
    if (!pdf) return;
    const { pages, invalidTokens } = parsePageRangeInput(rangeInput, pdf.pageCount);

    if (pages.length === 0) {
      setRangeNotice("No valid page numbers found. Try something like 1, 3, 5-8.");
      return;
    }

    setSelectedIndices(new Set(pages.map((page) => page - 1)));
    setRangeNotice(
      invalidTokens.length > 0
        ? `Ignored: ${invalidTokens.join(", ")} (outside 1–${pdf.pageCount}).`
        : null,
    );
  };

  const addFile = async (fileList: FileList | File[]) => {
    const file = Array.from(fileList)[0];

    revokeResultUrl();
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
        setErrorMessage("This PDF has no pages to extract.");
        return;
      }

      const pages: PdfPageInfo[] = pdfDoc.getPages().map((page, index) => {
        const { width, height } = page.getSize();
        return { index, width, height };
      });

      setPdf({ file, pageCount, pages });
      setSelectedIndices(new Set());
      setRangeInput("");
      setRangeNotice(null);
      setFilenameBase("TinyUtility");
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
    revokeResultUrl();
    thumbnailRenderTokenRef.current += 1;
    setPdf(null);
    setThumbnails([]);
    setSelectedIndices(new Set());
    setRangeInput("");
    setRangeNotice(null);
    setResult(null);
    setPhase("idle");
    setErrorMessage(null);
    setJustDownloaded(false);
  };

  const backToSelection = () => {
    setResult(null);
    setPhase("idle");
    setJustDownloaded(false);
  };

  const extractPages = async () => {
    if (!pdf || selectedCount === 0) return;

    setPhase("processing");
    setErrorMessage(null);

    const pdfLib = await loadPdfLib();

    try {
      const sourceBytes = await pdf.file.arrayBuffer();
      const sourceDoc = await pdfLib.PDFDocument.load(sourceBytes);
      const newDoc = await pdfLib.PDFDocument.create();
      const copiedPages = await newDoc.copyPages(sourceDoc, sortedSelectedIndices);

      copiedPages.forEach((page) => newDoc.addPage(page));

      const outputBytes = await newDoc.save();
      const blob = new Blob([toArrayBuffer(outputBytes)], { type: "application/pdf" });

      revokeResultUrl();
      objectUrlRef.current = URL.createObjectURL(blob);

      setResult({ blob, pageCount: copiedPages.length });
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

  const downloadResult = () => {
    if (!result) return;
    downloadBlob(result.blob, buildDownloadFilename(filenameBase, "pdf"));
    markDownloaded();
  };

  return (
    <section className="mt-16 space-y-6">
      <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-5 text-sm font-medium leading-6 text-cyan-100">
        Your PDF never leaves your device. Pages are selected and extracted entirely in your browser.
      </div>

      {showSuccessHero && result ? (
        <SuccessCard
          beforeActions={<FilenameField extension="pdf" onChange={setFilenameBase} value={filenameBase} />}
          downloadLabel="Download PDF"
          heroStat={{ label: "Pages extracted", value: `${result.pageCount}` }}
          justDownloaded={justDownloaded}
          onDownload={downloadResult}
          onReset={clearAll}
          resetLabel="Extract From Another PDF"
          stats={[
            { label: "Original pages", value: `${pdf?.pageCount ?? "—"}` },
            { label: "Extracted pages", value: `${result.pageCount}` },
            { label: "File size", value: formatBytes(result.blob.size) },
          ]}
          subtitle={`Created a new PDF with ${result.pageCount} page${result.pageCount === 1 ? "" : "s"}.`}
          title="PDF Ready"
        >
          <button
            className="mx-auto block text-sm font-medium text-cyan-300 transition hover:text-cyan-100"
            onClick={backToSelection}
            type="button"
          >
            Change page selection
          </button>
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

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2" role="group" aria-label="Page selection shortcuts">
                    <button
                      className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-violet-300/40 hover:text-white"
                      onClick={selectAll}
                      type="button"
                    >
                      Select All
                    </button>
                    <button
                      className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-violet-300/40 hover:text-white"
                      onClick={clearSelection}
                      type="button"
                    >
                      Clear
                    </button>
                    <button
                      className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-violet-300/40 hover:text-white"
                      onClick={invertSelection}
                      type="button"
                    >
                      Invert Selection
                    </button>
                  </div>
                  <p aria-live="polite" className="text-sm font-semibold text-violet-200">
                    {selectedLabel}
                  </p>
                </div>

                <div
                  aria-label="PDF pages"
                  className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5"
                  role="group"
                >
                  {pdf.pages.map((page) => {
                    const isSelected = selectedIndices.has(page.index);
                    const pageNumber = page.index + 1;

                    return (
                      <button
                        aria-label={`Page ${pageNumber}, ${isSelected ? "selected" : "not selected"}`}
                        aria-pressed={isSelected}
                        className={`group flex flex-col items-center rounded-xl border p-2 transition focus:outline-none focus:ring-2 focus:ring-violet-300/60 focus:ring-offset-2 focus:ring-offset-[#060816] ${
                          isSelected
                            ? "border-violet-300/70 bg-violet-400/10"
                            : "border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]"
                        }`}
                        disabled={isBusy}
                        key={page.index}
                        onClick={() => togglePage(page.index)}
                        type="button"
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
                          {isSelected ? (
                            <span className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-violet-400 text-[#060816]">
                              <svg
                                aria-hidden="true"
                                className="size-3"
                                fill="none"
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                viewBox="0 0 24 24"
                              >
                                <path d="m5 13 4 4L19 7" />
                              </svg>
                            </span>
                          ) : null}
                        </span>
                        <span
                          className={`mt-2 text-xs font-semibold ${isSelected ? "text-violet-200" : "text-slate-400"}`}
                        >
                          {pageNumber}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 sm:p-8">
              <h2 className="text-lg font-semibold text-white">Extract pages</h2>

              {pdf ? (
                <div className="mt-5">
                  <label className="block" htmlFor="page-range-input">
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Or type page numbers
                    </span>
                    <div className="mt-2 flex gap-2">
                      <input
                        className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#080b1a] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-violet-300/50 focus:ring-2 focus:ring-violet-300/20"
                        disabled={isBusy}
                        id="page-range-input"
                        onChange={(event) => setRangeInput(event.target.value)}
                        placeholder="1, 3, 5-8"
                        type="text"
                        value={rangeInput}
                      />
                      <button
                        className="shrink-0 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-violet-300/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={isBusy || rangeInput.trim().length === 0}
                        onClick={applyRangeInput}
                        type="button"
                      >
                        Apply
                      </button>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      Replaces the current selection, e.g. &quot;1, 3, 5-8, 12&quot;.
                    </p>
                    {rangeNotice ? (
                      <p className="mt-2 text-xs text-amber-200" role="status">
                        {rangeNotice}
                      </p>
                    ) : null}
                  </label>
                </div>
              ) : (
                <p className="mt-4 text-sm leading-6 text-slate-400">
                  Add a PDF to choose which pages to keep.
                </p>
              )}

              <button
                className="mt-6 w-full rounded-full bg-gradient-to-r from-[#4F46E5] via-[#06B6D4] to-[#14B8A6] px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:shadow-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                disabled={!pdf || selectedCount === 0 || isBusy}
                onClick={extractPages}
                type="button"
              >
                {phase === "processing" ? "Extracting..." : "Extract Pages"}
              </button>

              <div className="mt-5 space-y-3">
                {phase === "preparing" ? <ProcessingState subtitle="Reading your PDF" title="Preparing" /> : null}
                {phase === "processing" ? (
                  <ProcessingState subtitle="Building your new PDF locally" title="Extracting" />
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
