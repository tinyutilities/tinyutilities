"use client";

import { useEffect, useMemo, useRef, useState } from "react";
// Type-only import: fully erased at compile time, so this does not pull pdf-lib into this
// route's JS bundle. The runtime value is loaded lazily via `loadPdfLib()` below.
import type { PDFRef } from "pdf-lib";
import {
  ErrorCard,
  EstimatePanel,
  formatBytes,
  ProcessingState,
  ProgressIndicator,
  SelectedFileRow,
  SuccessCard,
  UploadCard,
} from "@/components/upload";
import type { UploadPhase } from "@/components/upload";

type CompressionLevel = "light" | "medium" | "strong";

type SelectedPdf = {
  id: string;
  file: File;
  pageCount: number;
};

type CompressionResult = {
  blob: Blob;
  originalSize: number;
  compressedSize: number;
  imagesRecompressed: number;
};

const maxFileSize = 100 * 1024 * 1024;

const levelOptions: Array<{ value: CompressionLevel; label: string; description: string }> = [
  {
    value: "light",
    label: "Light",
    description: "Highest quality. Small size reduction — best when quality matters most.",
  },
  {
    value: "medium",
    label: "Medium",
    description: "Balanced quality and size. Recommended for most PDFs.",
  },
  {
    value: "strong",
    label: "Strong",
    description: "Maximum size reduction. May noticeably reduce embedded image quality.",
  },
];

// JPEG re-encode quality per level. Applied only to embedded images that use DCTDecode
// (i.e. are already JPEGs) — the one image format a browser canvas can honestly re-compress.
const qualityByLevel: Record<CompressionLevel, number> = {
  light: 0.85,
  medium: 0.68,
  strong: 0.45,
};

// Images larger than this (on their longest side) are downscaled before re-encoding.
const maxDimensionByLevel: Record<CompressionLevel, number> = {
  light: Number.POSITIVE_INFINITY,
  medium: 2200,
  strong: 1400,
};

function isPdfFile(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

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

function getReduction(originalSize: number, compressedSize: number) {
  if (originalSize === 0) return 0;
  return Math.max(Math.round((1 - compressedSize / originalSize) * 100), 0);
}

/** pdf-lib is only needed once the user actually adds or compresses a PDF, so it's dynamically
 *  imported here rather than bundled with every route — the heavy lifting stays out of the
 *  initial page load for every other tool. */
function loadPdfLib() {
  return import("pdf-lib");
}

async function readPageCount(file: File, pdfLib: Awaited<ReturnType<typeof loadPdfLib>>) {
  const bytes = await file.arrayBuffer();
  const pdfDoc = await pdfLib.PDFDocument.load(bytes);
  return pdfDoc.getPageCount();
}

function getPdfErrorMessage(error: unknown, pdfLib: Awaited<ReturnType<typeof loadPdfLib>>) {
  if (error instanceof pdfLib.EncryptedPDFError) {
    return "This PDF is password-protected. Remove the password and try again.";
  }

  return "This file couldn't be read. It may be corrupted or not a valid PDF.";
}

async function compressPdf(
  file: File,
  level: CompressionLevel,
  onProgress: (percent: number) => void,
): Promise<CompressionResult> {
  const pdfLib = await loadPdfLib();
  const { PDFDocument, PDFName, PDFRawStream } = pdfLib;

  const originalBytes = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(originalBytes);

  // Strip metadata that adds bytes without adding value.
  pdfDoc.setTitle("");
  pdfDoc.setAuthor("");
  pdfDoc.setSubject("");
  pdfDoc.setKeywords([]);
  pdfDoc.setProducer("TinyUtility");
  pdfDoc.setCreator("TinyUtility");

  const quality = qualityByLevel[level];
  const maxDimension = maxDimensionByLevel[level];
  const context = pdfDoc.context;

  // Only DCTDecode (JPEG) image streams can be honestly recompressed client-side: their raw
  // stream bytes already are a JPEG, so they can be decoded and re-encoded directly. PDFs built
  // mostly from vector graphics, text, or non-JPEG images will see little change here — that's
  // expected, not a bug, and is reflected honestly in the result.
  const imageEntries: Array<[PDFRef, ReturnType<typeof PDFRawStream.of>]> = [];

  for (const [ref, obj] of context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFRawStream)) continue;

    const subtype = obj.dict.get(PDFName.of("Subtype"));
    const filter = obj.dict.get(PDFName.of("Filter"));

    if (subtype?.toString() === "/Image" && filter?.toString() === "/DCTDecode") {
      imageEntries.push([ref as PDFRef, obj]);
    }
  }

  let imagesRecompressed = 0;

  for (const [index, [ref, stream]] of imageEntries.entries()) {
    try {
      const jpegBytes = stream.getContents();
      const bitmap = await createImageBitmap(new Blob([toArrayBuffer(jpegBytes)], { type: "image/jpeg" }));

      let { width, height } = bitmap;
      if (width > maxDimension || height > maxDimension) {
        const scale = maxDimension / Math.max(width, height);
        width = Math.max(1, Math.round(width * scale));
        height = Math.max(1, Math.round(height * scale));
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx2d = canvas.getContext("2d");

      if (!ctx2d) throw new Error("Canvas unavailable");

      ctx2d.drawImage(bitmap, 0, 0, width, height);
      bitmap.close();

      const newBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (result) => (result ? resolve(result) : reject(new Error("Could not encode image"))),
          "image/jpeg",
          quality,
        );
      });
      const newBytes = new Uint8Array(await newBlob.arrayBuffer());

      if (newBytes.length < jpegBytes.length) {
        const dict = stream.dict;

        dict.set(PDFName.of("Width"), context.obj(width));
        dict.set(PDFName.of("Height"), context.obj(height));
        dict.set(PDFName.of("Filter"), PDFName.of("DCTDecode"));
        dict.set(PDFName.of("ColorSpace"), PDFName.of("DeviceRGB"));
        dict.delete(PDFName.of("DecodeParms"));
        dict.delete(PDFName.of("Decode"));
        context.assign(ref, PDFRawStream.of(dict, newBytes));
        imagesRecompressed += 1;
      }
    } catch {
      // Leave images that fail to decode/re-encode untouched rather than failing the whole file.
    }

    onProgress(Math.round(((index + 1) / imageEntries.length) * 100));
  }

  if (imageEntries.length === 0) {
    onProgress(100);
  }

  const compressedBytes = await pdfDoc.save({ useObjectStreams: true });
  const compressedBlob = new Blob([toArrayBuffer(compressedBytes)], { type: "application/pdf" });

  // Safety net: never hand back a file larger than what the user uploaded.
  const finalBlob = compressedBlob.size < file.size ? compressedBlob : new Blob([originalBytes], { type: "application/pdf" });

  return {
    blob: finalBlob,
    originalSize: file.size,
    compressedSize: finalBlob.size,
    imagesRecompressed,
  };
}

export function PdfCompressorTool() {
  const downloadedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pdf, setPdf] = useState<SelectedPdf | null>(null);
  const [level, setLevel] = useState<CompressionLevel>("medium");
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | undefined>(undefined);
  const [result, setResult] = useState<CompressionResult | null>(null);
  const [justDownloaded, setJustDownloaded] = useState(false);

  useEffect(() => {
    return () => {
      if (downloadedTimeoutRef.current) clearTimeout(downloadedTimeoutRef.current);
    };
  }, []);

  const reduction = useMemo(
    () => (result ? getReduction(result.originalSize, result.compressedSize) : 0),
    [result],
  );

  const addFile = async (fileList: FileList | File[]) => {
    const file = Array.from(fileList)[0];

    setResult(null);
    setErrorMessage(null);
    setProgress(undefined);

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
      const pageCount = await readPageCount(file, pdfLib);

      if (pageCount === 0) {
        setPhase("error");
        setErrorMessage("This PDF has no pages to compress.");
        return;
      }

      setPdf({ id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`, file, pageCount });
      setPhase("idle");
    } catch (error) {
      setPhase("error");
      setErrorMessage(getPdfErrorMessage(error, pdfLib));
    }
  };

  const clearPdf = () => {
    setPdf(null);
    setResult(null);
    setErrorMessage(null);
    setProgress(undefined);
    setPhase("idle");
    setJustDownloaded(false);
  };

  const runCompression = async () => {
    if (!pdf) return;

    setResult(null);
    setPhase("processing");
    setProgress(0);

    try {
      const outcome = await compressPdf(pdf.file, level, setProgress);

      setResult(outcome);
      setPhase("completed");
    } catch (error) {
      const pdfLib = await loadPdfLib();

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
    if (!result || !pdf) return;
    const baseName = pdf.file.name.replace(/\.pdf$/i, "") || "document";
    downloadBlob(result.blob, `${baseName}_compressed_tinyutility.pdf`);
    markDownloaded();
  };

  const isBusy = phase === "preparing" || phase === "processing";
  const showSuccessHero = phase === "completed" && result;

  const subtitle = useMemo(() => {
    if (!result) return "";

    if (reduction < 3) {
      return "This PDF was already tightly packed, so only minimal savings were possible.";
    }

    return result.imagesRecompressed > 0
      ? `Recompressed ${result.imagesRecompressed} embedded image${result.imagesRecompressed === 1 ? "" : "s"} and optimized the file structure.`
      : "Reduced file size by stripping unneeded metadata and optimizing the file structure.";
  }, [reduction, result]);

  return (
    <section className="mt-16 space-y-6">
      <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-5 text-sm font-medium leading-6 text-cyan-100">
        PDFs are compressed entirely in your browser. Nothing is uploaded.
      </div>

      {showSuccessHero ? (
        <SuccessCard
          downloadLabel="Download PDF"
          heroStat={{ label: "Saved", value: `${reduction}%` }}
          justDownloaded={justDownloaded}
          onDownload={downloadResult}
          onReset={clearPdf}
          resetLabel="Compress Another PDF"
          stats={[
            { label: "Original", value: formatBytes(result.originalSize) },
            { label: "Compressed", value: formatBytes(result.compressedSize) },
            { label: "Pages", value: `${pdf?.pageCount ?? "—"}` },
          ]}
          subtitle={subtitle}
          title="PDF Ready"
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
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
              <UploadCard
                accept="application/pdf"
                compact
                disabled={isBusy}
                formatsLabel="PDF"
                onFiles={(files) => void addFile(files)}
              />
            )}

            {pdf ? (
              <div className="mt-6 grid gap-3">
                <SelectedFileRow
                  actions={
                    <button
                      aria-label={`Remove ${pdf.file.name}`}
                      className="rounded-full border border-red-300/25 px-3 py-2 text-xs font-semibold text-red-200 transition hover:border-red-200/50 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-300/50 disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={isBusy}
                      onClick={clearPdf}
                      type="button"
                    >
                      Remove
                    </button>
                  }
                  detail={`${pdf.pageCount} page${pdf.pageCount === 1 ? "" : "s"}`}
                  name={pdf.file.name}
                  sizeLabel={formatBytes(pdf.file.size)}
                  typeLabel="PDF"
                />
              </div>
            ) : null}
          </div>

          <aside className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 sm:p-8">
            <h2 className="text-lg font-semibold text-white">Compression level</h2>
            <div className="mt-4 grid gap-2.5" role="radiogroup" aria-label="Compression level">
              {levelOptions.map((option) => (
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${
                    level === option.value
                      ? "border-cyan-300/50 bg-cyan-300/10"
                      : "border-white/10 bg-[#080b1a]/70 hover:border-white/20"
                  }`}
                  key={option.value}
                >
                  <input
                    checked={level === option.value}
                    className="mt-1 size-4 accent-cyan-300"
                    disabled={isBusy}
                    name="compression-level"
                    onChange={() => setLevel(option.value)}
                    type="radio"
                    value={option.value}
                  />
                  <span>
                    <span className="flex items-center gap-2 text-sm font-semibold text-white">
                      {option.label}
                      {option.value === "medium" ? (
                        <span className="rounded-full bg-teal-300/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-teal-200">
                          Recommended
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-slate-400">{option.description}</span>
                  </span>
                </label>
              ))}
            </div>

            {pdf && !isBusy ? (
              <div className="mt-5">
                <EstimatePanel
                  items={[
                    { label: "Pages", value: `${pdf.pageCount}` },
                    { label: "Input size", value: formatBytes(pdf.file.size) },
                    { label: "Level", value: levelOptions.find((option) => option.value === level)?.label ?? level },
                  ]}
                />
              </div>
            ) : null}

            <button
              className="mt-5 w-full rounded-full bg-gradient-to-r from-[#4F46E5] via-[#06B6D4] to-[#14B8A6] px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:shadow-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              disabled={!pdf || isBusy}
              onClick={runCompression}
              type="button"
            >
              {phase === "processing" ? "Compressing..." : "Compress PDF"}
            </button>

            <div className="mt-5 space-y-3">
              {phase === "preparing" ? (
                <ProcessingState subtitle="Reading your PDF" title="Preparing" />
              ) : null}
              {phase === "processing" ? (
                <>
                  <ProcessingState subtitle="Recompressing embedded images locally" title="Compressing" />
                  <ProgressIndicator label="Compression progress" value={progress} />
                </>
              ) : null}
              {phase === "error" && errorMessage ? (
                <ErrorCard message={errorMessage} title="Something went wrong" />
              ) : null}
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}
