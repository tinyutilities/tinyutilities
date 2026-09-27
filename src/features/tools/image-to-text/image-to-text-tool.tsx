"use client";

import { useId, useRef, useState } from "react";
import {
  buildDownloadFilename,
  ErrorCard,
  FilenameField,
  formatBytes,
  ProcessingState,
  ProgressIndicator,
  SelectedFileRow,
  UploadCard,
} from "@/components/upload";
import type { UploadPhase } from "@/components/upload";

const acceptedTypes = ["image/jpeg", "image/png", "image/webp"];
const maxFileSize = 20 * 1024 * 1024;
const defaultFilenameBase = "TinyUtility-OCR";

type UploadedImage = {
  file: File;
  previewUrl: string;
  width: number;
  height: number;
};

function createImageRecord(file: File): Promise<UploadedImage> {
  return new Promise((resolve, reject) => {
    const previewUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      resolve({ file, previewUrl, width: image.naturalWidth, height: image.naturalHeight });
    };

    image.onerror = () => {
      URL.revokeObjectURL(previewUrl);
      reject(new Error("This file couldn't be read. It may be corrupted or not a valid image."));
    };

    image.src = previewUrl;
  });
}

/**
 * Re-encodes the source image as a PNG via canvas before handing it to the OCR engine. The
 * three accepted input formats (JPG/PNG/WebP) all decode fine in a canvas, but the bundled
 * Tesseract WASM build's image support is really about Leptonica's own decoders — normalizing
 * to PNG here sidesteps any uncertainty about WebP support in that build, at near-zero cost.
 */
async function normalizeToPng(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;

  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Could not prepare this image for text extraction.");
  }

  context.drawImage(bitmap, 0, 0);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) {
    throw new Error("Could not prepare this image for text extraction.");
  }

  return blob;
}

/** Tesseract.js is a large, model-backed OCR engine, so it's imported dynamically here rather
 *  than at module top level — it never loads until the user actually runs OCR, and never touches
 *  any other tool's page bundle. Its worker script, WASM core, and English language data are all
 *  self-hosted under /public/tesseract (same pattern as the pdf.worker.min.mjs used by the PDF
 *  tools) so recognition never depends on a third-party CDN and stays genuinely same-origin. */
function loadTesseract() {
  return import("tesseract.js");
}

/** Maps Tesseract's own lifecycle status strings to plain-language progress text. Every value
 *  shown is the engine's own real progress for whichever phase is currently running — never a
 *  fabricated overall percentage. */
function describeStatus(status: string): string {
  switch (status) {
    case "loading tesseract core":
      return "Loading OCR engine…";
    case "loading language traineddata":
      return "Loading language data…";
    case "initializing tesseract":
    case "initializing api":
      return "Preparing OCR engine…";
    case "recognizing text":
      return "Detecting text…";
    default:
      return "Working…";
  }
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

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.download = filename;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

async function buildDocxBlob(text: string): Promise<Blob> {
  const { Document, Packer, Paragraph, TextRun } = await import("docx");

  const lines = text.length > 0 ? text.split(/\r\n|\r|\n/) : [""];
  const paragraphs = lines.map(
    (line) => new Paragraph({ children: line ? [new TextRun(line)] : [] }),
  );

  const doc = new Document({
    sections: [{ properties: {}, children: paragraphs }],
  });

  return Packer.toBlob(doc);
}

export function ImageToTextTool() {
  const textareaId = useId();
  const objectUrlRef = useRef<string | null>(null);
  const downloadedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [image, setImage] = useState<UploadedImage | null>(null);
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusText, setStatusText] = useState("Preparing image…");
  const [progress, setProgress] = useState<number | undefined>(undefined);
  const [extractedText, setExtractedText] = useState("");
  const [noTextDetected, setNoTextDetected] = useState(false);
  const [filenameBase, setFilenameBase] = useState(defaultFilenameBase);
  const [copyLabel, setCopyLabel] = useState("Copy Text");
  const [justDownloadedFormat, setJustDownloadedFormat] = useState<"txt" | "docx" | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const isBusy = phase === "preparing" || phase === "processing";
  const hasResult = phase === "completed" || phase === "downloaded";

  const trackObjectUrl = (url: string) => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = url;
    return url;
  };

  const resetResult = () => {
    setExtractedText("");
    setNoTextDetected(false);
    setDownloadError(null);
    setCopyLabel("Copy Text");
    setJustDownloadedFormat(null);
  };

  const addFile = async (fileList: FileList | File[]) => {
    const file = Array.from(fileList)[0];
    if (!file) return;

    resetResult();
    setErrorMessage(null);

    if (!acceptedTypes.includes(file.type)) {
      setPhase("error");
      setErrorMessage("Please choose a JPG, PNG, or WEBP image.");
      return;
    }

    if (file.size > maxFileSize) {
      setPhase("error");
      setErrorMessage(`The image must be ${formatBytes(maxFileSize)} or smaller.`);
      return;
    }

    setPhase("preparing");
    setStatusText("Preparing image…");

    try {
      const record = await createImageRecord(file);
      trackObjectUrl(record.previewUrl);
      setImage(record);
      setFilenameBase(defaultFilenameBase);
      setPhase("idle");
    } catch (error) {
      setPhase("error");
      setErrorMessage(error instanceof Error ? error.message : "Could not load this image.");
    }
  };

  const clearAll = () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
    setImage(null);
    setPhase("idle");
    setErrorMessage(null);
    resetResult();
  };

  const runOcr = async () => {
    if (!image) return;

    setPhase("processing");
    setErrorMessage(null);
    setProgress(undefined);
    setStatusText("Preparing image…");

    try {
      const pngBlob = await normalizeToPng(image.file);
      const Tesseract = await loadTesseract();

      let worker: Awaited<ReturnType<typeof Tesseract.createWorker>>;

      try {
        worker = await Tesseract.createWorker("eng", Tesseract.OEM.LSTM_ONLY, {
          workerPath: "/tesseract/worker.min.js",
          corePath: "/tesseract/core",
          langPath: "/tesseract/lang",
          logger: (message) => {
            setStatusText(describeStatus(message.status));
            setProgress(Math.round(message.progress * 100));
          },
        });
      } catch {
        setPhase("error");
        setErrorMessage("Could not start the OCR engine. Please try again.");
        return;
      }

      try {
        const { data } = await worker.recognize(pngBlob);
        const text = data.text.trim();

        setStatusText("Finalizing…");
        setExtractedText(text);
        setNoTextDetected(text.length === 0);
        setPhase("completed");
      } catch {
        setPhase("error");
        setErrorMessage("Could not extract text from this image. Try a different image.");
      } finally {
        void worker.terminate();
      }
    } catch (error) {
      setPhase("error");
      setErrorMessage(error instanceof Error ? error.message : "Could not process this image.");
    }
  };

  const backToImage = () => {
    resetResult();
    setPhase("idle");
  };

  const markDownloaded = (format: "txt" | "docx") => {
    setJustDownloadedFormat(format);
    if (downloadedTimeoutRef.current) clearTimeout(downloadedTimeoutRef.current);
    downloadedTimeoutRef.current = setTimeout(() => setJustDownloadedFormat(null), 3000);
  };

  const downloadTxt = () => {
    setDownloadError(null);
    try {
      const blob = new Blob([extractedText], { type: "text/plain;charset=utf-8" });
      downloadBlob(blob, buildDownloadFilename(filenameBase, "txt", defaultFilenameBase));
      markDownloaded("txt");
    } catch {
      setDownloadError("Could not create the text file. Please try again.");
    }
  };

  const downloadDocx = async () => {
    setDownloadError(null);
    try {
      const blob = await buildDocxBlob(extractedText);
      downloadBlob(blob, buildDownloadFilename(filenameBase, "docx", defaultFilenameBase));
      markDownloaded("docx");
    } catch {
      setDownloadError("Could not create the Word document. Try again, or download as TXT instead.");
    }
  };

  const copyText = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(extractedText);
      } else if (!copyWithFallback(extractedText)) {
        throw new Error("Fallback copy failed.");
      }

      setCopyLabel("Copied ✓");
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopyLabel("Copy Text"), 1600);
    } catch {
      setCopyLabel("Couldn't copy — select text manually");
    }
  };

  return (
    <section className="mt-16 space-y-6">
      <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-5 text-sm font-medium leading-6 text-cyan-100">
        Your image is processed locally in your browser. Nothing is uploaded.
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 sm:p-8">
          {!image ? (
            <UploadCard
              accept="image/jpeg,image/png,image/webp"
              disabled={isBusy}
              formatsLabel="JPG, PNG, and WEBP"
              helperText={`Maximum ${formatBytes(maxFileSize)}.`}
              onFiles={(files) => void addFile(files)}
            />
          ) : (
            <>
              <UploadCard
                accept="image/jpeg,image/png,image/webp"
                compact
                disabled={isBusy}
                formatsLabel="JPG, PNG, and WEBP"
                onFiles={(files) => void addFile(files)}
              />
              <div className="mt-6">
                <SelectedFileRow
                  actions={
                    <button
                      aria-label={`Remove ${image.file.name}`}
                      className="rounded-full border border-red-300/25 px-3 py-2 text-xs font-semibold text-red-200 transition hover:border-red-200/50 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-300/50 disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={isBusy}
                      onClick={clearAll}
                      type="button"
                    >
                      Remove
                    </button>
                  }
                  detail={`${image.width} x ${image.height} px`}
                  name={image.file.name}
                  sizeLabel={formatBytes(image.file.size)}
                  thumbnailUrl={image.previewUrl}
                  typeLabel={image.file.type.replace("image/", "").toUpperCase()}
                />
              </div>

              <div className="mt-6">
                {/* eslint-disable-next-line @next/next/no-img-element -- local object URL, not a next/image-eligible asset */}
                <img
                  alt="Selected image to extract text from"
                  className="mx-auto max-h-[28rem] w-auto max-w-full rounded-xl ring-1 ring-white/10"
                  src={image.previewUrl}
                />
              </div>
            </>
          )}

          {!image ? null : (
            <div className="mt-6 space-y-3">
              {!hasResult ? (
                <button
                  className="w-full rounded-full bg-gradient-to-r from-[#4F46E5] via-[#06B6D4] to-[#14B8A6] px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:shadow-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                  disabled={isBusy}
                  onClick={() => void runOcr()}
                  type="button"
                >
                  {isBusy ? "Extracting…" : "Extract Text"}
                </button>
              ) : (
                <button
                  className="w-full rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:border-white/30 hover:bg-white/10"
                  onClick={backToImage}
                  type="button"
                >
                  Extract Again
                </button>
              )}

              {phase === "preparing" ? <ProcessingState subtitle={statusText} title="Preparing" /> : null}
              {phase === "processing" ? (
                <div className="space-y-3">
                  <ProcessingState subtitle={statusText} title="Running OCR" />
                  <ProgressIndicator label={statusText} value={progress} />
                </div>
              ) : null}
              {phase === "error" && errorMessage ? (
                <ErrorCard message={errorMessage} title="Something went wrong" />
              ) : null}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 sm:p-8">
          <label className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300" htmlFor={textareaId}>
            Extracted text
          </label>

          {!hasResult ? (
            <p className="mt-4 text-sm leading-6 text-slate-400">
              Add an image and click Extract Text to see the result here. You&apos;ll be able to
              review and edit it before copying or downloading.
            </p>
          ) : (
            <>
              {noTextDetected ? (
                <p className="mt-2 text-sm text-amber-200" role="status">
                  No text could be detected in this image. Try a clearer image with larger,
                  higher-contrast text.
                </p>
              ) : (
                <p className="mt-1 text-xs text-slate-500">You can correct any mistakes before copying or downloading.</p>
              )}

              <textarea
                aria-label="Extracted text (editable)"
                className="mt-3 min-h-[16rem] w-full resize-y rounded-2xl border border-white/10 bg-[#080b1a]/80 p-4 font-mono text-sm leading-6 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/20"
                id={textareaId}
                onChange={(event) => setExtractedText(event.target.value)}
                placeholder="Extracted text will appear here."
                spellCheck="true"
                value={extractedText}
              />

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-5 py-2.5 text-sm font-semibold text-cyan-100 transition hover:-translate-y-0.5 hover:border-cyan-200/50 hover:bg-cyan-300/15 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                  disabled={!extractedText}
                  onClick={() => void copyText()}
                  type="button"
                >
                  {copyLabel}
                </button>
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-[#080b1a]/70 p-4">
                <h2 className="text-sm font-semibold text-white">Download as</h2>
                <div className="mt-3">
                  <FilenameField extension="txt" onChange={setFilenameBase} value={filenameBase} />
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    className="rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                    disabled={!extractedText}
                    onClick={downloadTxt}
                    type="button"
                  >
                    {justDownloadedFormat === "txt" ? "Downloaded ✓" : "Download TXT"}
                  </button>
                  <button
                    className="rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                    disabled={!extractedText}
                    onClick={() => void downloadDocx()}
                    type="button"
                  >
                    {justDownloadedFormat === "docx" ? "Downloaded ✓" : "Download Word (.docx)"}
                  </button>
                </div>
                {downloadError ? (
                  <p className="mt-3 text-sm text-red-300" role="alert">
                    {downloadError}
                  </p>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
