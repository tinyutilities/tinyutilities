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
} from "@/components/tools/tool-ui";
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
import { downloadBlob } from "@/lib/browser/download";
import { parsePageRange } from "@/lib/pdf/page-range";
import { addWatermark, detectImageFormat, validateWatermarkOptions, type WatermarkLayout, type WatermarkOptions } from "@/lib/pdf/watermark";
import { getPdfErrorMessage, loadPdfLib, toArrayBuffer } from "../pdf-shared/pdf-loaders";
import { PdfFilePicker } from "../pdf-shared/pdf-file-picker";
import { useSinglePdf } from "../pdf-shared/use-single-pdf";

type Kind = "text" | "image";

const kindOptions: Array<{ value: Kind; label: string }> = [
  { value: "text", label: "Text" },
  { value: "image", label: "Image" },
];

const layoutOptions: Array<{ value: WatermarkLayout; label: string }> = [
  { value: "center", label: "Centered" },
  { value: "tile", label: "Repeated across the page" },
];

const maxImageBytes = 10 * 1024 * 1024;
const defaultFilenameBase = "TinyUtility-watermarked";

export function PdfWatermarkTool() {
  const textId = useId();
  const sizeId = useId();
  const colorId = useId();
  const opacityId = useId();
  const rotationId = useId();
  const widthId = useId();
  const rangeId = useId();
  const downloadedTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { pdf, isLoading, loadError, load, clear } = useSinglePdf();
  const [kind, setKind] = useState<Kind>("text");
  const [text, setText] = useState("CONFIDENTIAL");
  const [fontSize, setFontSize] = useState(64);
  const [color, setColor] = useState("#808080");
  const [opacity, setOpacity] = useState(0.3);
  const [rotation, setRotation] = useState(45);
  const [layout, setLayout] = useState<WatermarkLayout>("center");
  const [pageRange, setPageRange] = useState("");
  const [widthPercent, setWidthPercent] = useState(40);

  const [image, setImage] = useState<{ file: File; bytes: Uint8Array; url: string } | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [processError, setProcessError] = useState<string | null>(null);
  const [result, setResult] = useState<{ blob: Blob; pages: number; copies: number } | null>(null);
  const [filenameBase, setFilenameBase] = useState(defaultFilenameBase);
  const [justDownloaded, setJustDownloaded] = useState(false);

  // Release the preview URL of the watermark image when it is replaced or the tool unmounts.
  useEffect(() => {
    const url = image?.url;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [image]);

  const selection = useMemo(() => (pdf ? parsePageRange(pageRange, pdf.pageCount) : null), [pdf, pageRange]);
  const pages = useMemo(() => (selection?.ok ? selection.pages : []), [selection]);

  const options: WatermarkOptions | null = useMemo(() => {
    if (kind === "text") return { kind: "text", text, fontSize, color, opacity, rotation, layout, pages };
    if (!image) return null;
    return { kind: "image", bytes: image.bytes, widthPercent, opacity, rotation, layout, pages };
  }, [kind, text, fontSize, color, opacity, rotation, layout, pages, image, widthPercent]);

  const validationError = selection && !selection.ok ? selection.error : options ? validateWatermarkOptions(options) : "Choose an image to use as the watermark.";

  const chooseImage = async (files: FileList | File[]) => {
    const file = Array.from(files)[0];
    setImageError(null);
    if (!file) return;

    if (file.size > maxImageBytes) {
      setImageError(`This image is ${formatBytes(file.size)}. The limit is ${formatBytes(maxImageBytes)}.`);
      return;
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!detectImageFormat(bytes)) {
      setImageError("The watermark image must be a PNG or JPEG file.");
      return;
    }

    setImage({ file, bytes, url: URL.createObjectURL(file) });
    setRotation(0);
  };

  const apply = async () => {
    if (!pdf || !options || validationError) return;

    setIsProcessing(true);
    setProcessError(null);

    try {
      const pdfLib = await loadPdfLib();
      const output = await addWatermark(pdfLib, await pdf.file.arrayBuffer(), options);
      setResult({ blob: new Blob([toArrayBuffer(output.bytes)], { type: "application/pdf" }), pages: output.watermarkedPages, copies: output.copiesPerPage });
      setFilenameBase(`${pdf.file.name.replace(/\.pdf$/i, "") || "document"}-watermarked`);
    } catch (error) {
      setProcessError(getPdfErrorMessage(error));
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    if (downloadedTimeout.current) clearTimeout(downloadedTimeout.current);
    setResult(null);
    setJustDownloaded(false);
    clear();
  };

  const download = () => {
    if (!result) return;
    downloadBlob(result.blob, buildDownloadFilename(filenameBase, "pdf", defaultFilenameBase));
    setJustDownloaded(true);
    if (downloadedTimeout.current) clearTimeout(downloadedTimeout.current);
    downloadedTimeout.current = setTimeout(() => setJustDownloaded(false), 3000);
  };

  return (
    <section className="mt-16 space-y-6">
      <PrivacyNote>Your PDF and any watermark image never leave your device. The watermark is added entirely in your browser.</PrivacyNote>

      {result ? (
        <SuccessCard
          beforeActions={<FilenameField extension="pdf" onChange={setFilenameBase} value={filenameBase} />}
          downloadLabel="Download PDF"
          heroStat={{ label: result.pages === 1 ? "page watermarked" : "pages watermarked", value: String(result.pages) }}
          justDownloaded={justDownloaded}
          onDownload={download}
          onReset={reset}
          resetLabel="Watermark Another PDF"
          stats={[
            { label: "Copies per page", value: String(result.copies) },
            { label: "File size", value: formatBytes(result.blob.size) },
          ]}
          subtitle="Your watermarked PDF is ready."
          title="Watermark Added"
        >
          <button
            className="mx-auto block text-sm font-medium text-teal-300 transition hover:text-teal-100"
            onClick={() => setResult(null)}
            type="button"
          >
            Change the watermark options
          </button>
        </SuccessCard>
      ) : (
        <>
          <Panel>
            <PdfFilePicker disabled={isProcessing} error={loadError} isLoading={isLoading} onClear={clear} onFiles={(files) => void load(files)} pdf={pdf} />
          </Panel>

          {pdf ? (
            <Panel>
              <PanelLabel>Watermark</PanelLabel>
              <div className="mt-4 space-y-5">
                <ChoiceGroup legend="Watermark type" onChange={setKind} options={kindOptions} value={kind} />

                {kind === "text" ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="text-sm font-semibold text-white" htmlFor={textId}>
                        Text
                      </label>
                      <input
                        className="mt-2 w-full rounded-xl border border-white/10 bg-[#080b1a] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
                        id={textId}
                        maxLength={100}
                        onChange={(event) => setText(event.target.value)}
                        value={text}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-white" htmlFor={sizeId}>
                        Font size: {fontSize} pt
                      </label>
                      <input
                        className="mt-3 w-full accent-cyan-400"
                        id={sizeId}
                        max={200}
                        min={8}
                        onChange={(event) => setFontSize(Number(event.target.value))}
                        type="range"
                        value={fontSize}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-white" htmlFor={colorId}>
                        Color
                      </label>
                      <input
                        className="mt-2 block h-11 w-20 cursor-pointer rounded-lg border border-white/10 bg-[#080b1a] p-1"
                        id={colorId}
                        onChange={(event) => setColor(event.target.value)}
                        type="color"
                        value={color}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {image ? (
                      <SelectedFileRow
                        actions={
                          <Button onClick={() => setImage(null)} variant="neutral">
                            Remove
                          </Button>
                        }
                        name={image.file.name}
                        sizeLabel={formatBytes(image.file.size)}
                        thumbnailUrl={image.url}
                        typeLabel={detectImageFormat(image.bytes) === "png" ? "PNG" : "JPEG"}
                      />
                    ) : (
                      <UploadCard accept="image/png,image/jpeg" formatsLabel="PNG and JPEG" helperText="Maximum 10 MB." onFiles={(files) => void chooseImage(files)} />
                    )}
                    {imageError ? <ErrorMessage>{imageError}</ErrorMessage> : null}
                    <div>
                      <label className="text-sm font-semibold text-white" htmlFor={widthId}>
                        Image width: {widthPercent}% of the page width
                      </label>
                      <input
                        className="mt-3 w-full accent-cyan-400"
                        id={widthId}
                        max={100}
                        min={5}
                        onChange={(event) => setWidthPercent(Number(event.target.value))}
                        type="range"
                        value={widthPercent}
                      />
                    </div>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-semibold text-white" htmlFor={opacityId}>
                      Opacity: {Math.round(opacity * 100)}%
                    </label>
                    <input
                      className="mt-3 w-full accent-cyan-400"
                      id={opacityId}
                      max={100}
                      min={5}
                      onChange={(event) => setOpacity(Number(event.target.value) / 100)}
                      type="range"
                      value={Math.round(opacity * 100)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-white" htmlFor={rotationId}>
                      Rotation: {rotation}°
                    </label>
                    <input
                      className="mt-3 w-full accent-cyan-400"
                      id={rotationId}
                      max={180}
                      min={-180}
                      onChange={(event) => setRotation(Number(event.target.value))}
                      step={5}
                      type="range"
                      value={rotation}
                    />
                  </div>
                </div>

                <ChoiceGroup legend="Layout" onChange={setLayout} options={layoutOptions} value={layout} />

                <div className="max-w-md">
                  <label className="text-sm font-semibold text-white" htmlFor={rangeId}>
                    Pages to watermark
                  </label>
                  <input
                    className="mt-2 w-full rounded-xl border border-white/10 bg-[#080b1a] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
                    id={rangeId}
                    onChange={(event) => setPageRange(event.target.value)}
                    placeholder="All pages (e.g. 1-3, 5, 8-)"
                    value={pageRange}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-6">
                  <div
                    aria-label="Approximate preview of the watermark"
                    className="relative flex aspect-[8.5/11] w-28 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white shadow-lg"
                    role="img"
                  >
                    {kind === "text" ? (
                      <span
                        className="whitespace-nowrap font-bold"
                        style={{ color, opacity, fontSize: `${Math.max(5, fontSize / 9)}px`, transform: `rotate(${-rotation}deg)` }}
                      >
                        {text || " "}
                      </span>
                    ) : image ? (
                      // eslint-disable-next-line @next/next/no-img-element -- Local object URL, not optimizable by next/image.
                      <img alt="" src={image.url} style={{ opacity, width: `${widthPercent}%`, transform: `rotate(${-rotation}deg)` }} />
                    ) : null}
                  </div>
                  <p className="max-w-sm text-sm text-slate-400">
                    {pages.length > 0 ? `${pages.length} page${pages.length === 1 ? "" : "s"} will be watermarked.` : "No pages selected."} The
                    preview is approximate{layout === "tile" ? "; the real result repeats the mark across the page" : ""}.
                  </p>
                </div>
              </div>

              {validationError && (kind === "text" || image) ? <ErrorMessage>{validationError}</ErrorMessage> : null}

              <div className="mt-6">
                <InfoNote>
                  The watermark is drawn on top of each page&apos;s existing content, so it can cover text and images beneath it, and it
                  becomes part of the page. Text watermarks use a built-in font (Western European characters only); use an image for other
                  scripts. Keep your original file.
                </InfoNote>
              </div>

              <div className="mt-6">
                <Button disabled={isProcessing || Boolean(validationError)} onClick={() => void apply()} variant="primary">
                  {isProcessing ? "Adding watermark…" : "Add Watermark"}
                </Button>
              </div>
              <div className="mt-4 space-y-3">
                {isProcessing ? <ProcessingState subtitle="Drawing the watermark locally" title="Processing" /> : null}
                {processError ? <ErrorCard message={processError} title="Could not add the watermark" /> : null}
              </div>
            </Panel>
          ) : null}
        </>
      )}
    </section>
  );
}
