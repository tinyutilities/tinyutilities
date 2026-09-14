"use client";

import { useRef, useState } from "react";
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

type UploadedImage = {
  file: File;
  previewUrl: string;
  width: number;
  height: number;
};

type ResizedImage = {
  previewUrl: string;
  blob: Blob;
  width: number;
  height: number;
};

type OutputMimeType = "image/jpeg" | "image/png" | "image/webp";

const acceptedTypes = ["image/jpeg", "image/png", "image/webp"];
const maxFileSize = 100 * 1024 * 1024;
const maxDimension = 10000;
// Resizing shouldn't visibly degrade a lossy image beyond the resample itself — this is a
// fixed, sensible default rather than an exposed slider (matches the "not a lab" brief).
const jpegWebpQuality = 0.92;

const extensionByMimeType: Record<OutputMimeType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const labelByMimeType: Record<OutputMimeType, string> = {
  "image/jpeg": "JPEG",
  "image/png": "PNG",
  "image/webp": "WebP",
};

const presets = [25, 50, 75, 100] as const;

function isSupportedType(type: string): type is OutputMimeType {
  return acceptedTypes.includes(type);
}

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

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: OutputMimeType, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Your browser could not export this image."))),
      mimeType,
      quality,
    );
  });
}

async function resizeImage(file: File, mimeType: OutputMimeType, width: number, height: number) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d", { alpha: mimeType !== "image/jpeg" });

  if (!context) {
    bitmap.close();
    throw new Error("Could not prepare this image for resizing.");
  }

  if (mimeType === "image/jpeg") {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
  }

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const quality = mimeType === "image/png" ? undefined : jpegWebpQuality;

  return canvasToBlob(canvas, mimeType, quality as number);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.download = filename;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

function isValidDimension(value: number) {
  return Number.isFinite(value) && Number.isInteger(value) && value >= 1 && value <= maxDimension;
}

export function ImageResizerTool() {
  const objectUrlsRef = useRef<string[]>([]);
  const downloadedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [image, setImage] = useState<UploadedImage | null>(null);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [keepAspectRatio, setKeepAspectRatio] = useState(true);
  const [result, setResult] = useState<ResizedImage | null>(null);
  const [filenameBase, setFilenameBase] = useState("TinyUtility");
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [justDownloaded, setJustDownloaded] = useState(false);

  const aspectRatio = image && image.height > 0 ? image.width / image.height : 1;
  const outputFormat: OutputMimeType = image && isSupportedType(image.file.type) ? image.file.type : "image/jpeg";
  const extension = extensionByMimeType[outputFormat];

  const widthError = width > 0 && !isValidDimension(width) ? `Width must be a whole number between 1 and ${maxDimension}.` : null;
  const heightError = height > 0 && !isValidDimension(height) ? `Height must be a whole number between 1 and ${maxDimension}.` : null;
  const dimensionsAreValid = isValidDimension(width) && isValidDimension(height);
  const isUnchanged = image ? width === image.width && height === image.height : false;

  const isBusy = phase === "preparing" || phase === "processing";
  const showSuccessHero = phase === "completed" && result !== null;

  const trackObjectUrl = (url: string) => {
    objectUrlsRef.current.push(url);
    return url;
  };

  const revokeAll = () => {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current = [];
  };

  const setWidthKeepingRatio = (nextWidth: number) => {
    setWidth(nextWidth);
    if (keepAspectRatio && nextWidth > 0) {
      setHeight(Math.max(1, Math.round(nextWidth / aspectRatio)));
    }
  };

  const setHeightKeepingRatio = (nextHeight: number) => {
    setHeight(nextHeight);
    if (keepAspectRatio && nextHeight > 0) {
      setWidth(Math.max(1, Math.round(nextHeight * aspectRatio)));
    }
  };

  const applyPreset = (percent: number) => {
    if (!image) return;
    setWidth(Math.max(1, Math.round((image.width * percent) / 100)));
    setHeight(Math.max(1, Math.round((image.height * percent) / 100)));
  };

  const addFile = async (fileList: FileList | File[]) => {
    const file = Array.from(fileList)[0];

    revokeAll();
    setResult(null);
    setErrorMessage(null);

    if (!file) return;

    if (!acceptedTypes.includes(file.type)) {
      setPhase("error");
      setErrorMessage("Please choose a JPG, PNG, or WEBP image.");
      return;
    }

    if (file.size > maxFileSize) {
      setPhase("error");
      setErrorMessage("The image must be 100 MB or smaller.");
      return;
    }

    setPhase("preparing");

    try {
      const record = await createImageRecord(file);

      trackObjectUrl(record.previewUrl);
      setImage(record);
      setWidth(record.width);
      setHeight(record.height);
      setFilenameBase("TinyUtility");
      setPhase("idle");
    } catch (error) {
      setPhase("error");
      setErrorMessage(error instanceof Error ? error.message : "Could not load this image.");
    }
  };

  const clearAll = () => {
    revokeAll();
    setImage(null);
    setResult(null);
    setWidth(0);
    setHeight(0);
    setPhase("idle");
    setErrorMessage(null);
    setJustDownloaded(false);
  };

  const backToEditing = () => {
    setResult(null);
    setPhase("idle");
    setJustDownloaded(false);
  };

  const runResize = async () => {
    if (!image || !dimensionsAreValid) return;

    setPhase("processing");
    setErrorMessage(null);

    try {
      const blob = await resizeImage(image.file, outputFormat, width, height);
      const previewUrl = trackObjectUrl(URL.createObjectURL(blob));

      setResult({ previewUrl, blob, width, height });
      setPhase("completed");
    } catch (error) {
      setPhase("error");
      setErrorMessage(error instanceof Error ? error.message : "This image could not be resized.");
    }
  };

  const markDownloaded = () => {
    setJustDownloaded(true);
    if (downloadedTimeoutRef.current) clearTimeout(downloadedTimeoutRef.current);
    downloadedTimeoutRef.current = setTimeout(() => setJustDownloaded(false), 3000);
  };

  const downloadResult = () => {
    if (!result) return;
    downloadBlob(result.blob, buildDownloadFilename(filenameBase, extension));
    markDownloaded();
  };

  return (
    <section className="mt-16 space-y-6">
      <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-5 text-sm font-medium leading-6 text-cyan-100">
        Images are resized entirely in your browser. Nothing is uploaded.
      </div>

      {showSuccessHero && result ? (
        <SuccessCard
          beforeActions={
            <div className="space-y-6">
              {/* eslint-disable-next-line @next/next/no-img-element -- local object URL, not a next/image-eligible asset */}
              <img
                alt={`Resized preview, ${result.width} by ${result.height} pixels`}
                className="mx-auto max-h-64 w-auto max-w-full rounded-xl object-contain ring-1 ring-white/10"
                src={result.previewUrl}
              />
              <FilenameField extension={extension} onChange={setFilenameBase} value={filenameBase} />
            </div>
          }
          downloadLabel="Download Image"
          justDownloaded={justDownloaded}
          onDownload={downloadResult}
          onReset={clearAll}
          resetLabel="Resize Another Image"
          stats={[
            { label: "Dimensions", value: `${result.width} × ${result.height} px` },
            { label: "File size", value: formatBytes(result.blob.size) },
            { label: "Format", value: labelByMimeType[outputFormat] },
          ]}
          subtitle={`Resized to ${result.width} × ${result.height} px.`}
          title="Image Ready"
          heroStat={{ label: "New size", value: `${result.width}×${result.height}` }}
        >
          <button
            className="mx-auto block text-sm font-medium text-cyan-300 transition hover:text-cyan-100"
            onClick={backToEditing}
            type="button"
          >
            Adjust dimensions again
          </button>
        </SuccessCard>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 sm:p-8">
            {!image ? (
              <UploadCard
                accept="image/jpeg,image/png,image/webp"
                disabled={isBusy}
                formatsLabel="JPG, PNG, and WEBP"
                helperText="Maximum 100 MB."
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
                <div className="mt-6 grid gap-3">
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
                    typeLabel={labelByMimeType[outputFormat]}
                  />
                </div>
              </>
            )}
          </div>

          <aside className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 sm:p-8">
            <h2 className="text-lg font-semibold text-white">Resize options</h2>

            {image ? (
              <div className="mt-6 grid gap-5">
                <div className="grid grid-cols-2 gap-3">
                  <label className="block" htmlFor="resize-width">
                    <span className="text-sm font-semibold text-white">Width</span>
                    <input
                      className="mt-2 w-full rounded-xl border border-white/10 bg-[#080b1a] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
                      disabled={isBusy}
                      id="resize-width"
                      inputMode="numeric"
                      min={1}
                      onChange={(event) => setWidthKeepingRatio(Math.round(Number(event.target.value)))}
                      type="number"
                      value={width || ""}
                    />
                  </label>
                  <label className="block" htmlFor="resize-height">
                    <span className="text-sm font-semibold text-white">Height</span>
                    <input
                      className="mt-2 w-full rounded-xl border border-white/10 bg-[#080b1a] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
                      disabled={isBusy}
                      id="resize-height"
                      inputMode="numeric"
                      min={1}
                      onChange={(event) => setHeightKeepingRatio(Math.round(Number(event.target.value)))}
                      type="number"
                      value={height || ""}
                    />
                  </label>
                </div>

                {widthError || heightError ? (
                  <p className="-mt-2 text-xs text-red-300" role="alert">
                    {widthError ?? heightError}
                  </p>
                ) : null}

                <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#080b1a]/70 px-4 py-3 text-sm text-slate-200 transition hover:border-cyan-300/30">
                  <span className="font-semibold text-white">Keep aspect ratio</span>
                  <input
                    checked={keepAspectRatio}
                    className="size-4 accent-cyan-300"
                    onChange={() => setKeepAspectRatio((current) => !current)}
                    type="checkbox"
                  />
                </label>

                <div>
                  <span className="text-sm font-semibold text-white">Quick presets</span>
                  <div className="mt-2 grid grid-cols-4 gap-2">
                    {presets.map((percent) => (
                      <button
                        className="rounded-xl border border-white/10 bg-white/[0.04] py-2.5 text-sm font-semibold text-slate-200 transition hover:border-cyan-300/40 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={isBusy}
                        key={percent}
                        onClick={() => applyPreset(percent)}
                        type="button"
                      >
                        {percent}%
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#080b1a]/70 p-4 text-sm leading-6 text-slate-300">
                  Resulting size:{" "}
                  <span className="font-semibold text-white">
                    {dimensionsAreValid ? `${width} × ${height} px` : "—"}
                  </span>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm leading-6 text-slate-400">
                Add an image to set its new width and height.
              </p>
            )}

            <button
              className="mt-5 w-full rounded-full bg-gradient-to-r from-[#4F46E5] via-[#06B6D4] to-[#14B8A6] px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:shadow-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              disabled={!image || !dimensionsAreValid || isUnchanged || isBusy}
              onClick={runResize}
              type="button"
            >
              {phase === "processing" ? "Resizing..." : "Resize Image"}
            </button>

            <div className="mt-5 space-y-3">
              {phase === "preparing" ? <ProcessingState subtitle="Reading your image" title="Preparing" /> : null}
              {phase === "processing" ? (
                <ProcessingState subtitle="Resizing locally in your browser" title="Processing" />
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
