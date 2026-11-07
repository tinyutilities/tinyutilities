"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  Button,
  ChoiceGroup,
  ErrorMessage,
  InfoNote,
  Panel,
  PanelLabel,
  PrivacyNote,
  SelectField,
} from "@/components/tools/tool-ui";
import {
  buildDownloadFilename,
  ErrorCard,
  FilenameField,
  formatBytes,
  ProcessingState,
  ProgressIndicator,
  sanitizeBaseFilename,
  SuccessCard,
} from "@/components/upload";
import { downloadBlob } from "@/lib/browser/download";
import { parsePageRange } from "@/lib/pdf/page-range";
import {
  computeRenderSize,
  dpiOptions,
  imageFilename,
  imageFormats,
  maxTotalOutputBytes,
  zipImages,
  type ImageFormat,
  type ZipEntry,
} from "@/lib/pdf/render-plan";
import { PdfFilePicker } from "../pdf-shared/pdf-file-picker";
import { getPdfErrorMessage, loadPdfJs } from "../pdf-shared/pdf-loaders";
import { readPageCountWithPdfJs, useSinglePdf } from "../pdf-shared/use-single-pdf";

const dpiChoices = dpiOptions.map((dpi) => ({
  value: String(dpi),
  label: dpi === 72 ? "72 DPI (screen, smallest)" : dpi === 150 ? "150 DPI (good for reading)" : dpi === 300 ? "300 DPI (print quality)" : `${dpi} DPI`,
}));

type Output = {
  blob: Blob;
  kind: "image" | "zip";
  imageCount: number;
  firstWidth: number;
  firstHeight: number;
  clamped: boolean;
  previewUrl: string;
  extension: string;
};

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, mimeType, quality));
}

export function PdfToImagesTool() {
  const rangeId = useId();
  const qualityId = useId();
  const cancelRef = useRef(false);
  const downloadedTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { pdf, isLoading, loadError, load, clear } = useSinglePdf(readPageCountWithPdfJs);
  const [format, setFormat] = useState<ImageFormat>("png");
  const [dpi, setDpi] = useState("150");
  const [quality, setQuality] = useState(90);
  const [pageRange, setPageRange] = useState("");

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processError, setProcessError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [output, setOutput] = useState<Output | null>(null);
  const [filenameBase, setFilenameBase] = useState("TinyUtility-pages");
  const [justDownloaded, setJustDownloaded] = useState(false);

  const selection = useMemo(() => (pdf ? parsePageRange(pageRange, pdf.pageCount) : null), [pdf, pageRange]);
  const formatInfo = imageFormats.find((entry) => entry.value === format)!;

  // Release the preview URL when it is replaced or the tool unmounts.
  useEffect(() => {
    const url = output?.previewUrl;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [output]);

  const convert = async () => {
    if (!pdf || !selection?.ok) return;

    cancelRef.current = false;
    setIsProcessing(true);
    setProgress(0);
    setProcessError(null);
    setNotice(null);

    let task: Awaited<ReturnType<Awaited<ReturnType<typeof loadPdfJs>>["getDocument"]>> | null = null;

    try {
      const pdfjs = await loadPdfJs();
      task = pdfjs.getDocument({ data: new Uint8Array(await pdf.file.arrayBuffer()) });
      const document = await task.promise;
      const base = sanitizeBaseFilename(pdf.file.name.replace(/\.pdf$/i, ""), "document");
      const entries: ZipEntry[] = [];
      let totalBytes = 0;
      let clamped = false;
      let firstSize = { width: 0, height: 0 };
      let previewBlob: Blob | null = null;

      for (const [index, pageNumber] of selection.pages.entries()) {
        if (cancelRef.current) {
          setNotice("Conversion cancelled. No files were created.");
          return;
        }

        const page = await document.getPage(pageNumber);
        const natural = page.getViewport({ scale: 1 });
        const size = computeRenderSize(natural.width, natural.height, Number(dpi));
        clamped ||= size.clamped;

        const canvas = window.document.createElement("canvas");
        canvas.width = size.width;
        canvas.height = size.height;

        try {
          await page.render({ canvas, viewport: page.getViewport({ scale: size.scale }), background: "rgb(255, 255, 255)" }).promise;
        } finally {
          page.cleanup();
        }

        const blob = await canvasToBlob(canvas, formatInfo.mimeType, quality / 100);
        canvas.width = 0;
        canvas.height = 0;

        if (!blob) {
          throw new Error(`Page ${pageNumber} could not be turned into an image. It may be too large for this browser; try a lower DPI.`);
        }

        if (blob.type !== formatInfo.mimeType) {
          throw new Error(`This browser can't export ${formatInfo.label.split(" ")[0]} images. Choose PNG or JPEG instead.`);
        }

        const data = new Uint8Array(await blob.arrayBuffer());
        totalBytes += data.length;

        if (totalBytes > maxTotalOutputBytes) {
          throw new Error(`The images are over ${formatBytes(maxTotalOutputBytes)} in total. Choose fewer pages or a lower DPI.`);
        }

        if (index === 0) {
          firstSize = { width: size.width, height: size.height };
          previewBlob = blob;
        }

        entries.push({ name: imageFilename(base, pageNumber, pdf.pageCount, formatInfo.extension), data });
        setProgress(((index + 1) / selection.pages.length) * 100);
      }

      let resultBlob: Blob;
      let kind: Output["kind"];

      if (entries.length === 1) {
        resultBlob = new Blob([entries[0].data as Uint8Array<ArrayBuffer>], { type: formatInfo.mimeType });
        kind = "image";
      } else {
        const fflate = await import("fflate");
        resultBlob = new Blob([zipImages(fflate, entries) as Uint8Array<ArrayBuffer>], { type: "application/zip" });
        kind = "zip";
      }

      setOutput({
        blob: resultBlob,
        kind,
        imageCount: entries.length,
        firstWidth: firstSize.width,
        firstHeight: firstSize.height,
        clamped,
        previewUrl: URL.createObjectURL(previewBlob ?? resultBlob),
        extension: kind === "image" ? formatInfo.extension : "zip",
      });
      setFilenameBase(kind === "image" ? `${base}-page-${selection.pages[0]}` : `${base}-pages`);
    } catch (error) {
      setProcessError(getPdfErrorMessage(error));
    } finally {
      await task?.destroy();
      setIsProcessing(false);
    }
  };

  const reset = () => {
    if (downloadedTimeout.current) clearTimeout(downloadedTimeout.current);
    setOutput(null);
    setJustDownloaded(false);
    setProcessError(null);
    clear();
  };

  const download = () => {
    if (!output) return;
    downloadBlob(output.blob, buildDownloadFilename(filenameBase, output.extension, "TinyUtility-pages"));
    setJustDownloaded(true);
    if (downloadedTimeout.current) clearTimeout(downloadedTimeout.current);
    downloadedTimeout.current = setTimeout(() => setJustDownloaded(false), 3000);
  };

  return (
    <section className="mt-16 space-y-6">
      <PrivacyNote>Your PDF never leaves your device. Pages are rendered into images entirely in your browser.</PrivacyNote>

      {output ? (
        <SuccessCard
          beforeActions={<FilenameField extension={output.extension} onChange={setFilenameBase} value={filenameBase} />}
          downloadLabel={output.kind === "zip" ? "Download ZIP" : "Download Image"}
          heroStat={{ label: output.imageCount === 1 ? "image created" : "images created", value: String(output.imageCount) }}
          justDownloaded={justDownloaded}
          onDownload={download}
          onReset={reset}
          resetLabel="Convert Another PDF"
          stats={[
            { label: "Format", value: formatInfo.label.split(" ")[0] },
            { label: "Image size", value: `${output.firstWidth} × ${output.firstHeight} px` },
            { label: output.kind === "zip" ? "ZIP size" : "File size", value: formatBytes(output.blob.size) },
          ]}
          subtitle={output.kind === "zip" ? "Your pages are bundled in a ZIP file." : "Your page image is ready."}
          title="Pages Converted"
        >
          {output.clamped ? (
            <p className="mb-4 text-center text-sm text-amber-200" role="status">
              Some pages were very large, so they were rendered at a lower resolution than you chose to stay within browser limits.
            </p>
          ) : null}
          <div className="mx-auto w-fit rounded-xl bg-white p-1 shadow-lg">
            {/* eslint-disable-next-line @next/next/no-img-element -- Local object URL, not optimizable by next/image. */}
            <img alt="Preview of the first converted page" className="max-h-56 w-auto rounded-lg" src={output.previewUrl} />
          </div>
          <button
            className="mx-auto mt-4 block text-sm font-medium text-teal-300 transition hover:text-teal-100"
            onClick={() => setOutput(null)}
            type="button"
          >
            Change the options
          </button>
        </SuccessCard>
      ) : (
        <>
          <Panel>
            <PdfFilePicker disabled={isProcessing} error={loadError} isLoading={isLoading} onClear={clear} onFiles={(files) => void load(files)} pdf={pdf} />
          </Panel>

          {pdf ? (
            <Panel>
              <PanelLabel>Image options</PanelLabel>
              <div className="mt-4 space-y-5">
                <ChoiceGroup
                  legend="Image format"
                  onChange={setFormat}
                  options={imageFormats.map((entry) => ({ value: entry.value, label: entry.label }))}
                  value={format}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <SelectField id={`${rangeId}-dpi`} label="Resolution" onChange={setDpi} options={dpiChoices} value={dpi} />
                  <div>
                    <label className="text-sm font-semibold text-white" htmlFor={rangeId}>
                      Pages to convert
                    </label>
                    <input
                      className="mt-2 w-full rounded-xl border border-white/10 bg-[#080b1a] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
                      id={rangeId}
                      onChange={(event) => setPageRange(event.target.value)}
                      placeholder="All pages (e.g. 1-3, 5, 8-)"
                      value={pageRange}
                    />
                  </div>
                </div>
                {formatInfo.lossy ? (
                  <div className="max-w-sm">
                    <label className="text-sm font-semibold text-white" htmlFor={qualityId}>
                      Quality: {quality}%
                    </label>
                    <input
                      className="mt-3 w-full accent-cyan-400"
                      id={qualityId}
                      max={100}
                      min={30}
                      onChange={(event) => setQuality(Number(event.target.value))}
                      type="range"
                      value={quality}
                    />
                  </div>
                ) : null}

                {(() => {
                  if (!selection) return null;
                  if (!selection.ok) return <ErrorMessage>{selection.error}</ErrorMessage>;
                  return (
                    <p className="text-sm text-slate-400" role="status">
                      {selection.pages.length} page{selection.pages.length === 1 ? "" : "s"} will be converted
                      {selection.pages.length > 1 ? " and bundled into a ZIP file" : ""}.
                    </p>
                  );
                })()}
              </div>

              <div className="mt-6">
                <InfoNote>
                  Pages are drawn with a white background. Higher resolutions make larger images and take longer; very large pages are
                  automatically reduced to stay within your browser&apos;s limits, and you&apos;ll be told if that happens.
                </InfoNote>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button disabled={isProcessing || !selection?.ok} onClick={() => void convert()} variant="primary">
                  {isProcessing ? "Converting…" : "Convert to Images"}
                </Button>
                {isProcessing ? (
                  <Button onClick={() => (cancelRef.current = true)} variant="neutral">
                    Cancel
                  </Button>
                ) : null}
              </div>

              <div className="mt-4 space-y-3">
                {isProcessing ? (
                  <>
                    <ProcessingState subtitle={`${Math.round(progress)}% complete`} title="Rendering pages" />
                    <ProgressIndicator label="Conversion progress" value={progress} />
                  </>
                ) : null}
                {processError ? <ErrorCard message={processError} title="Could not convert this PDF" /> : null}
                {notice ? (
                  <p className="text-sm text-slate-300" role="status">
                    {notice}
                  </p>
                ) : null}
              </div>
            </Panel>
          ) : null}
        </>
      )}
    </section>
  );
}
