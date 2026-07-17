"use client";

import { degrees, PDFDocument } from "pdf-lib";
import type { DragEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

type PdfRecord = {
  id: string;
  file: File;
  pageCount: number;
  previewUrl: string;
  rotation: number;
};

type MergeStatus = "empty" | "loading" | "success" | "error";

const defaultMessage = "Add at least two PDF files to merge.";
const defaultFilename = "tinyutility-merged.pdf";

function getAddedMessage(count: number) {
  return `${count} PDF${count === 1 ? "" : "s"} added.`;
}

function formatBytes(bytes: number) {
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function isPdfFile(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function getPdfErrorMessage(fileName: string, error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (message.includes("encrypted") || message.includes("password")) {
    return `${fileName} appears to be password-protected. Password-protected PDFs are not supported yet.`;
  }

  if (message.includes("invalid") || message.includes("parse") || message.includes("pdf")) {
    return `${fileName} could not be read. It may be corrupted or not a valid PDF.`;
  }

  return `${fileName} could not be loaded. Try another PDF.`;
}

function sanitizeFilename(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return defaultFilename;
  }

  return trimmed.toLowerCase().endsWith(".pdf") ? trimmed : `${trimmed}.pdf`;
}

function toArrayBuffer(bytes: Uint8Array) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function yieldToBrowser() {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, 0);
  });
}

async function createPdfRecord(file: File): Promise<PdfRecord> {
  const bytes = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(bytes);
  const pageCount = pdfDoc.getPageCount();

  if (pageCount === 0) {
    throw new Error("empty pdf");
  }

  return {
    id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
    file,
    pageCount,
    previewUrl: URL.createObjectURL(file),
    rotation: 0,
  };
}

export function PdfMergerTool() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfsRef = useRef<PdfRecord[]>([]);
  const downloadUrlRef = useRef<string | null>(null);
  const draggedIdRef = useRef<string | null>(null);
  const [pdfs, setPdfs] = useState<PdfRecord[]>([]);
  const [status, setStatus] = useState<MergeStatus>("empty");
  const [message, setMessage] = useState(defaultMessage);
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadSize, setDownloadSize] = useState<number | null>(null);
  const [mergedPages, setMergedPages] = useState(0);
  const [filename, setFilename] = useState(defaultFilename);

  const totalPages = useMemo(
    () => pdfs.reduce((total, pdf) => total + pdf.pageCount, 0),
    [pdfs],
  );
  const totalSize = useMemo(
    () => pdfs.reduce((total, pdf) => total + pdf.file.size, 0),
    [pdfs],
  );
  const canMerge = pdfs.length >= 2 && status !== "loading";
  const pdfCountLabel = pdfs.length === 1 ? "1 PDF selected" : `${pdfs.length} PDFs selected`;
  const queueMessage = useMemo(() => {
    if (status === "loading" || downloadUrl) {
      return message;
    }

    if (status === "error") {
      return [pdfs.length > 0 ? getAddedMessage(pdfs.length) : "", message].filter(Boolean).join(" ");
    }

    if (pdfs.length > 0) {
      return getAddedMessage(pdfs.length);
    }

    return defaultMessage;
  }, [downloadUrl, message, pdfs.length, status]);
  const statusColor =
    status === "error" ? "text-red-300" : status === "success" ? "text-teal-300" : "text-slate-400";

  useEffect(() => {
    pdfsRef.current = pdfs;
  }, [pdfs]);

  useEffect(() => {
    downloadUrlRef.current = downloadUrl;
  }, [downloadUrl]);

  useEffect(() => {
    return () => {
      pdfsRef.current.forEach((pdf) => URL.revokeObjectURL(pdf.previewUrl));
      if (downloadUrlRef.current) {
        URL.revokeObjectURL(downloadUrlRef.current);
      }
    };
  }, []);

  const resetDownload = () => {
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }

    setDownloadSize(null);
    setMergedPages(0);
    setProgress(0);
  };

  const addFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    const validFiles = files.filter(isPdfFile);
    const invalidCount = files.length - validFiles.length;

    resetDownload();

    if (validFiles.length === 0) {
      setStatus("error");
      setMessage("Please choose valid PDF files.");
      return;
    }

    setStatus("loading");
    setMessage("Reading PDFs locally...");

    const nextPdfs: PdfRecord[] = [];
    const errors: string[] = [];

    for (const file of validFiles) {
      try {
        const record = await createPdfRecord(file);
        nextPdfs.push(record);
      } catch (error) {
        errors.push(getPdfErrorMessage(file.name, error));
      }

      await yieldToBrowser();
    }

    if (nextPdfs.length > 0) {
      setPdfs((currentPdfs) => [...currentPdfs, ...nextPdfs]);
    }

    if (nextPdfs.length === 0) {
      setStatus("error");
      setMessage(errors[0] ?? "No readable PDFs were found.");
      return;
    }

    setStatus(errors.length > 0 || invalidCount > 0 ? "error" : "success");
    setMessage(
      [
        invalidCount > 0 ? `${invalidCount} non-PDF file${invalidCount === 1 ? "" : "s"} skipped.` : "",
        errors[0] ?? "",
      ].filter(Boolean).join(" "),
    );
  };

  const removePdf = (id: string) => {
    resetDownload();
    setPdfs((currentPdfs) => {
      const pdf = currentPdfs.find((item) => item.id === id);

      if (pdf) {
        URL.revokeObjectURL(pdf.previewUrl);
      }

      const nextPdfs = currentPdfs.filter((item) => item.id !== id);

      if (nextPdfs.length === 0) {
        setStatus("empty");
        setMessage(defaultMessage);
      } else if (status !== "loading") {
        setStatus("success");
        setMessage("");
      }

      return nextPdfs;
    });
  };

  const rotatePdf = (id: string) => {
    resetDownload();
    if (status !== "loading") {
      setStatus("success");
      setMessage("");
    }
    setPdfs((currentPdfs) =>
      currentPdfs.map((pdf) => (
        pdf.id === id ? { ...pdf, rotation: (pdf.rotation + 90) % 360 } : pdf
      )),
    );
  };

  const movePdf = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || toIndex < 0 || toIndex >= pdfs.length) {
      return;
    }

    resetDownload();
    if (status !== "loading") {
      setStatus("success");
      setMessage("");
    }
    setPdfs((currentPdfs) => {
      const nextPdfs = [...currentPdfs];
      const [movedPdf] = nextPdfs.splice(fromIndex, 1);
      nextPdfs.splice(toIndex, 0, movedPdf);
      return nextPdfs;
    });
  };

  const handleDragStart = (event: DragEvent<HTMLElement>, id: string) => {
    draggedIdRef.current = id;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id);
  };

  const handleDrop = (event: DragEvent<HTMLElement>, targetId: string) => {
    event.preventDefault();
    const draggedId = draggedIdRef.current ?? event.dataTransfer.getData("text/plain");
    const fromIndex = pdfs.findIndex((pdf) => pdf.id === draggedId);
    const toIndex = pdfs.findIndex((pdf) => pdf.id === targetId);

    if (fromIndex !== -1 && toIndex !== -1) {
      movePdf(fromIndex, toIndex);
    }

    draggedIdRef.current = null;
  };

  const clearPdfs = () => {
    resetDownload();
    pdfs.forEach((pdf) => URL.revokeObjectURL(pdf.previewUrl));
    setPdfs([]);
    setStatus("empty");
    setMessage(defaultMessage);
  };

  const mergePdfs = async () => {
    if (pdfs.length < 2) {
      setStatus("error");
      setMessage(defaultMessage);
      return;
    }

    resetDownload();
    setStatus("loading");
    setProgress(5);
    setMessage("Preparing PDFs...");

    try {
      await yieldToBrowser();
      const mergedPdf = await PDFDocument.create();
      let completedPages = 0;

      setMessage("Merging documents...");

      for (const pdf of pdfs) {
        const sourceBytes = await pdf.file.arrayBuffer();
        const sourcePdf = await PDFDocument.load(sourceBytes);
        const pageIndices = sourcePdf.getPageIndices();
        const copiedPages = await mergedPdf.copyPages(sourcePdf, pageIndices);

        if (copiedPages.length === 0) {
          throw new Error(`${pdf.file.name} does not contain pages.`);
        }

        copiedPages.forEach((page) => {
          const currentRotation = page.getRotation().angle;
          page.setRotation(degrees((currentRotation + pdf.rotation) % 360));
          mergedPdf.addPage(page);
        });

        completedPages += copiedPages.length;
        setProgress(Math.max(10, Math.round((completedPages / totalPages) * 85)));
        await yieldToBrowser();
      }

      setMessage("Finalizing...");
      setProgress(95);
      await yieldToBrowser();

      const pdfBytes = await mergedPdf.save();
      const blob = new Blob([toArrayBuffer(pdfBytes)], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      setDownloadUrl(url);
      setDownloadSize(blob.size);
      setMergedPages(mergedPdf.getPageCount());
      setStatus("success");
      setProgress(100);
      setMessage("PDFs merged successfully.");
    } catch (error) {
      setStatus("error");
      setProgress(0);
      setMessage(getPdfErrorMessage("One of the selected PDFs", error));
    }
  };

  return (
    <section className="mt-16 space-y-6">
      <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-5 text-sm font-medium leading-6 text-cyan-100">
        Your PDFs never leave your device. Everything is processed locally in your browser.
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 sm:p-8">
          <div
            className="rounded-2xl border border-dashed border-cyan-300/35 bg-[#080b1a]/70 p-8 text-center transition hover:border-cyan-200/60"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              void addFiles(event.dataTransfer.files);
            }}
          >
            <p className="text-lg font-semibold text-white">Drop PDFs here</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Add two or more PDF files, reorder them, rotate full documents, then merge locally.
            </p>
            <button
              className="mt-6 rounded-full bg-gradient-to-r from-[#4F46E5] via-[#06B6D4] to-[#14B8A6] px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:shadow-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={status === "loading"}
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              Browse PDFs
            </button>
            <input
              accept="application/pdf,.pdf"
              className="sr-only"
              multiple
              onChange={(event) => {
                if (event.target.files) {
                  void addFiles(event.target.files);
                  event.target.value = "";
                }
              }}
              ref={fileInputRef}
              type="file"
            />
          </div>

          <div className="mt-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-semibold text-white">{pdfCountLabel}</p>
              {pdfs.length > 0 ? (
                <p className="mt-1 text-sm text-slate-400">
                  {totalPages} total page{totalPages === 1 ? "" : "s"} - {formatBytes(totalSize)}
                </p>
              ) : null}
            </div>
            <button
              className="rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-white/30 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={pdfs.length === 0 || status === "loading"}
              onClick={clearPdfs}
              type="button"
            >
              Clear all
            </button>
          </div>

          {pdfs.length > 0 ? (
            <div className="mt-6 grid gap-4">
              {pdfs.map((pdf, index) => (
                <article
                  className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:grid-cols-[104px_1fr_auto]"
                  draggable={status !== "loading"}
                  key={pdf.id}
                  onDragOver={(event) => event.preventDefault()}
                  onDragStart={(event) => handleDragStart(event, pdf.id)}
                  onDrop={(event) => handleDrop(event, pdf.id)}
                >
                  <div className="h-32 overflow-hidden rounded-xl border border-white/10 bg-white">
                    <iframe
                      className="h-40 w-32 origin-top-left scale-[0.82] bg-white"
                      src={`${pdf.previewUrl}#page=1&toolbar=0&navpanes=0&scrollbar=0`}
                      title={`First page preview of ${pdf.file.name}`}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <span
                        aria-label="Drag to reorder"
                        className="cursor-grab rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-xs font-semibold text-slate-400 active:cursor-grabbing"
                      >
                        Drag
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-300">
                        PDF {index + 1}
                      </span>
                    </div>
                    <h3 className="mt-3 truncate text-sm font-semibold text-white">{pdf.file.name}</h3>
                    <p className="mt-2 text-sm text-slate-400">
                      {formatBytes(pdf.file.size)} - {pdf.pageCount} page{pdf.pageCount === 1 ? "" : "s"}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">Rotation: {pdf.rotation} deg clockwise</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <button
                      className="rounded-full border border-white/15 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-cyan-300/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={index === 0 || status === "loading"}
                      onClick={() => movePdf(index, index - 1)}
                      type="button"
                    >
                      Up
                    </button>
                    <button
                      className="rounded-full border border-white/15 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-cyan-300/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={index === pdfs.length - 1 || status === "loading"}
                      onClick={() => movePdf(index, index + 1)}
                      type="button"
                    >
                      Down
                    </button>
                    <button
                      className="rounded-full border border-cyan-300/25 px-3 py-2 text-xs font-semibold text-cyan-100 transition hover:border-cyan-200/50 disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={status === "loading"}
                      onClick={() => rotatePdf(pdf.id)}
                      type="button"
                    >
                      Rotate
                    </button>
                    <button
                      className="rounded-full border border-red-300/25 px-3 py-2 text-xs font-semibold text-red-200 transition hover:border-red-200/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={status === "loading"}
                      onClick={() => removePdf(pdf.id)}
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center text-sm text-slate-400">
              No PDFs selected yet.
            </div>
          )}
        </div>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 sm:p-8">
            <h2 className="text-lg font-semibold text-white">Merge PDFs</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Files are merged in the order shown. Use drag-and-drop or the Up and Down buttons to reorder.
            </p>

            <button
              className="mt-6 w-full rounded-full bg-gradient-to-r from-[#4F46E5] via-[#06B6D4] to-[#14B8A6] px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:shadow-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              disabled={!canMerge}
              onClick={mergePdfs}
              type="button"
            >
              {status === "loading" ? "Merging..." : "Merge PDFs"}
            </button>

            {!canMerge && status !== "loading" ? (
              <p className="mt-3 text-sm text-slate-400">{defaultMessage}</p>
            ) : null}

            <div className="mt-5">
              <div
                aria-label={`PDF merge progress: ${progress}%`}
                aria-valuemax={100}
                aria-valuemin={0}
                aria-valuenow={progress}
                className="h-2 overflow-hidden rounded-full bg-white/10"
                role="progressbar"
              >
                <div
                  className="h-full rounded-full bg-teal-300 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className={`mt-3 text-sm ${statusColor}`} role={status === "error" ? "alert" : "status"}>
                {queueMessage}
              </p>
            </div>
          </div>

          {downloadUrl ? (
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 sm:p-8">
              <h2 className="text-lg font-semibold text-white">Download merged PDF</h2>
              <dl className="mt-5 grid gap-3 text-sm">
                <ResultStat label="Merged pages" value={`${mergedPages}`} />
                <ResultStat label="Final file size" value={downloadSize ? formatBytes(downloadSize) : "Available after merge"} />
              </dl>
              <label className="mt-5 block" htmlFor="merged-pdf-filename">
                <span className="text-sm font-semibold text-white">Filename</span>
                <input
                  className="mt-3 w-full rounded-xl border border-white/10 bg-[#080b1a] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
                  id="merged-pdf-filename"
                  onChange={(event) => setFilename(event.target.value)}
                  type="text"
                  value={filename}
                />
              </label>
              <a
                className="mt-5 block rounded-full border border-cyan-300/25 bg-cyan-300/10 px-6 py-3 text-center text-sm font-semibold text-cyan-100 transition hover:-translate-y-0.5 hover:border-cyan-200/50 hover:bg-cyan-300/15"
                download={sanitizeFilename(filename)}
                href={downloadUrl}
              >
                Download PDF
              </a>
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  );
}

type ResultStatProps = {
  label: string;
  value: string;
};

function ResultStat({ label, value }: ResultStatProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#080b1a]/70 p-4">
      <dt className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">{label}</dt>
      <dd className="mt-2 break-words text-sm font-semibold text-white">{value}</dd>
    </div>
  );
}
