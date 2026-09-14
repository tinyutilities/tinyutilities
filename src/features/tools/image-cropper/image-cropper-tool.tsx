"use client";

import { useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
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

type CroppedImage = {
  previewUrl: string;
  blob: Blob;
  width: number;
  height: number;
};

/** Crop selection in source-image pixels (not screen/CSS pixels) — this is the coordinate
 *  space the final crop is read from, so the box never drifts from what's rendered on screen
 *  regardless of how large the preview is displayed. */
type CropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type OutputMimeType = "image/jpeg" | "image/png" | "image/webp";

type AspectPresetId = "free" | "1:1" | "4:3" | "16:9";

type Handle = "nw" | "ne" | "sw" | "se";

const acceptedTypes = ["image/jpeg", "image/png", "image/webp"];
const maxFileSize = 100 * 1024 * 1024;
// Fixed, sensible default rather than an exposed slider — matches Image Resizer's approach.
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

const aspectPresets: { id: AspectPresetId; label: string; ratio: number | null }[] = [
  { id: "free", label: "Free", ratio: null },
  { id: "1:1", label: "1:1", ratio: 1 },
  { id: "4:3", label: "4:3", ratio: 4 / 3 },
  { id: "16:9", label: "16:9", ratio: 16 / 9 },
];

const handles: Handle[] = ["nw", "ne", "sw", "se"];

function isSupportedType(type: string): type is OutputMimeType {
  return acceptedTypes.includes(type);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
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

async function cropImage(file: File, mimeType: OutputMimeType, rect: CropRect) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d", { alpha: mimeType !== "image/jpeg" });

  if (!context) {
    bitmap.close();
    throw new Error("Could not prepare this image for cropping.");
  }

  if (mimeType === "image/jpeg") {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
  }

  // Extracted at 1:1 from the source bitmap — no resampling beyond what the crop itself
  // requires, so quality is preserved as well as the output encoder allows.
  const sx = clamp(Math.round(rect.x), 0, bitmap.width - 1);
  const sy = clamp(Math.round(rect.y), 0, bitmap.height - 1);
  const sw = clamp(width, 1, bitmap.width - sx);
  const sh = clamp(height, 1, bitmap.height - sy);

  context.drawImage(bitmap, sx, sy, sw, sh, 0, 0, width, height);
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

/** Largest crop box matching `ratio` (or a slightly inset default box when free-form) that
 *  fits centered within a `naturalWidth` x `naturalHeight` image. */
function centeredCropForRatio(naturalWidth: number, naturalHeight: number, ratio: number | null): CropRect {
  if (ratio === null) {
    const width = naturalWidth * 0.8;
    const height = naturalHeight * 0.8;
    return { x: (naturalWidth - width) / 2, y: (naturalHeight - height) / 2, width, height };
  }

  const imageRatio = naturalWidth / naturalHeight;
  const width = ratio > imageRatio ? naturalWidth : naturalHeight * ratio;
  const height = ratio > imageRatio ? naturalWidth / ratio : naturalHeight;

  return { x: (naturalWidth - width) / 2, y: (naturalHeight - height) / 2, width, height };
}

function clampCropRect(rect: CropRect, naturalWidth: number, naturalHeight: number): CropRect {
  const width = clamp(rect.width, 1, naturalWidth);
  const height = clamp(rect.height, 1, naturalHeight);

  return {
    width,
    height,
    x: clamp(rect.x, 0, naturalWidth - width),
    y: clamp(rect.y, 0, naturalHeight - height),
  };
}

export function ImageCropperTool() {
  const objectUrlsRef = useRef<string[]>([]);
  const downloadedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragStateRef = useRef<
    | { mode: "move"; pointerId: number; scale: number; startPointer: { x: number; y: number }; startRect: CropRect }
    | {
        mode: "resize";
        pointerId: number;
        scale: number;
        startPointer: { x: number; y: number };
        anchor: { x: number; y: number };
        startMoving: { x: number; y: number };
      }
    | null
  >(null);

  const [image, setImage] = useState<UploadedImage | null>(null);
  const [cropRect, setCropRect] = useState<CropRect | null>(null);
  const [aspectPreset, setAspectPreset] = useState<AspectPresetId>("free");
  const [result, setResult] = useState<CroppedImage | null>(null);
  const [filenameBase, setFilenameBase] = useState("TinyUtility");
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [justDownloaded, setJustDownloaded] = useState(false);

  const outputFormat: OutputMimeType = image && isSupportedType(image.file.type) ? image.file.type : "image/jpeg";
  const extension = extensionByMimeType[outputFormat];
  const isBusy = phase === "preparing" || phase === "processing";
  const showSuccessHero = phase === "completed" && result !== null;

  const cropWidth = cropRect ? Math.round(cropRect.width) : 0;
  const cropHeight = cropRect ? Math.round(cropRect.height) : 0;

  const cropBoxStyle = useMemo(() => {
    if (!image || !cropRect) return null;

    return {
      left: `${(cropRect.x / image.width) * 100}%`,
      top: `${(cropRect.y / image.height) * 100}%`,
      width: `${(cropRect.width / image.width) * 100}%`,
      height: `${(cropRect.height / image.height) * 100}%`,
    };
  }, [image, cropRect]);

  const trackObjectUrl = (url: string) => {
    objectUrlsRef.current.push(url);
    return url;
  };

  const revokeAll = () => {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current = [];
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
      setAspectPreset("free");
      setCropRect(centeredCropForRatio(record.width, record.height, null));
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
    setCropRect(null);
    setAspectPreset("free");
    setResult(null);
    setPhase("idle");
    setErrorMessage(null);
    setJustDownloaded(false);
  };

  const backToEditing = () => {
    setResult(null);
    setPhase("idle");
    setJustDownloaded(false);
  };

  const applyAspectPreset = (id: AspectPresetId) => {
    if (!image) return;
    setAspectPreset(id);
    const preset = aspectPresets.find((item) => item.id === id);
    setCropRect(centeredCropForRatio(image.width, image.height, preset?.ratio ?? null));
  };

  const beginMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!image || !cropRect || isBusy) return;
    const imgRect = imgRef.current?.getBoundingClientRect();
    if (!imgRect || imgRect.width === 0) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    dragStateRef.current = {
      mode: "move",
      pointerId: event.pointerId,
      scale: image.width / imgRect.width,
      startPointer: { x: event.clientX, y: event.clientY },
      startRect: cropRect,
    };
  };

  const beginResize = (handle: Handle) => (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!image || !cropRect || isBusy) return;
    const imgRect = imgRef.current?.getBoundingClientRect();
    if (!imgRect || imgRect.width === 0) return;

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);

    const anchor = {
      x: handle === "nw" || handle === "sw" ? cropRect.x + cropRect.width : cropRect.x,
      y: handle === "nw" || handle === "ne" ? cropRect.y + cropRect.height : cropRect.y,
    };
    const startMoving = {
      x: handle === "nw" || handle === "sw" ? cropRect.x : cropRect.x + cropRect.width,
      y: handle === "nw" || handle === "ne" ? cropRect.y : cropRect.y + cropRect.height,
    };

    dragStateRef.current = {
      mode: "resize",
      pointerId: event.pointerId,
      scale: image.width / imgRect.width,
      startPointer: { x: event.clientX, y: event.clientY },
      anchor,
      startMoving,
    };
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag || !image || drag.pointerId !== event.pointerId) return;

    const deltaX = (event.clientX - drag.startPointer.x) * drag.scale;
    const deltaY = (event.clientY - drag.startPointer.y) * drag.scale;

    if (drag.mode === "move") {
      const nextRect = clampCropRect(
        { ...drag.startRect, x: drag.startRect.x + deltaX, y: drag.startRect.y + deltaY },
        image.width,
        image.height,
      );
      setCropRect(nextRect);
      return;
    }

    const preset = aspectPresets.find((item) => item.id === aspectPreset);
    const ratio = preset?.ratio ?? null;
    const { anchor } = drag;

    let movingX = clamp(drag.startMoving.x + deltaX, 0, image.width);
    let movingY = clamp(drag.startMoving.y + deltaY, 0, image.height);

    if (ratio !== null) {
      const rawWidth = Math.abs(movingX - anchor.x);
      const rawHeight = Math.abs(movingY - anchor.y);
      const driveByWidth = rawWidth / ratio >= rawHeight;
      let width = driveByWidth ? rawWidth : rawHeight * ratio;
      const signX = movingX >= anchor.x ? 1 : -1;
      const signY = movingY >= anchor.y ? 1 : -1;

      // The box can't extend past the image edge on either axis. Convert both edges into
      // an equivalent max width (via the locked ratio) and use whichever is smaller, so the
      // ratio always holds exactly — even when one axis hits its boundary before the other.
      const maxWidthFromX = signX >= 0 ? image.width - anchor.x : anchor.x;
      const maxWidthFromY = (signY >= 0 ? image.height - anchor.y : anchor.y) * ratio;
      width = Math.min(width, maxWidthFromX, maxWidthFromY);

      movingX = anchor.x + signX * width;
      movingY = anchor.y + signY * (width / ratio);
    }

    const minSize = Math.max(20, Math.min(image.width, image.height) * 0.05);
    const nextRect = {
      x: Math.min(anchor.x, movingX),
      y: Math.min(anchor.y, movingY),
      width: Math.abs(movingX - anchor.x),
      height: Math.abs(movingY - anchor.y),
    };

    if (nextRect.width < minSize || nextRect.height < minSize) return;

    setCropRect(clampCropRect(nextRect, image.width, image.height));
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragStateRef.current?.pointerId === event.pointerId) {
      dragStateRef.current = null;
    }
  };

  const runCrop = async () => {
    if (!image || !cropRect) return;

    setPhase("processing");
    setErrorMessage(null);

    try {
      const blob = await cropImage(image.file, outputFormat, cropRect);
      const previewUrl = trackObjectUrl(URL.createObjectURL(blob));

      setResult({ previewUrl, blob, width: Math.round(cropRect.width), height: Math.round(cropRect.height) });
      setPhase("completed");
    } catch (error) {
      setPhase("error");
      setErrorMessage(error instanceof Error ? error.message : "This image could not be cropped.");
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
        Images are cropped entirely in your browser. Nothing is uploaded.
      </div>

      {showSuccessHero && result ? (
        <SuccessCard
          beforeActions={
            <div className="space-y-6">
              {/* eslint-disable-next-line @next/next/no-img-element -- local object URL, not a next/image-eligible asset */}
              <img
                alt={`Cropped preview, ${result.width} by ${result.height} pixels`}
                className="mx-auto max-h-64 w-auto max-w-full rounded-xl object-contain ring-1 ring-white/10"
                src={result.previewUrl}
              />
              <FilenameField extension={extension} onChange={setFilenameBase} value={filenameBase} />
            </div>
          }
          downloadLabel="Download Image"
          heroStat={{ label: "New size", value: `${result.width}×${result.height}` }}
          justDownloaded={justDownloaded}
          onDownload={downloadResult}
          onReset={clearAll}
          resetLabel="Crop Another Image"
          stats={[
            { label: "Dimensions", value: `${result.width} × ${result.height} px` },
            { label: "File size", value: formatBytes(result.blob.size) },
            { label: "Format", value: labelByMimeType[outputFormat] },
          ]}
          subtitle={`Cropped to ${result.width} × ${result.height} px.`}
          title="Image Ready"
        >
          <button
            className="mx-auto block text-sm font-medium text-cyan-300 transition hover:text-cyan-100"
            onClick={backToEditing}
            type="button"
          >
            Adjust crop again
          </button>
        </SuccessCard>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
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
                    typeLabel={labelByMimeType[outputFormat]}
                  />
                </div>

                <div className="relative mx-auto mt-6 inline-block max-w-full touch-none select-none">
                  {/* eslint-disable-next-line @next/next/no-img-element -- source is a local object URL, not a next/image-eligible static asset */}
                  <img
                    alt=""
                    aria-hidden="true"
                    className="block max-h-[65vh] w-auto max-w-full rounded-xl"
                    draggable={false}
                    ref={imgRef}
                    src={image.previewUrl}
                  />
                  {cropBoxStyle ? (
                    <div
                      aria-label={`Crop selection, ${cropWidth} by ${cropHeight} pixels`}
                      className="absolute cursor-move touch-none rounded-sm border-2 border-violet-300/80"
                      onPointerCancel={endDrag}
                      onPointerDown={beginMove}
                      onPointerMove={handlePointerMove}
                      onPointerUp={endDrag}
                      role="group"
                      style={{ ...cropBoxStyle, boxShadow: "0 0 0 9999px rgba(6,8,22,0.6)" }}
                    >
                      {handles.map((handle) => (
                        <div
                          aria-label={`Resize crop, ${handle} corner`}
                          className={`absolute size-6 rounded-full border-2 border-violet-300 bg-[#060816] shadow-md ${
                            handle === "nw"
                              ? "-left-3 -top-3 cursor-nwse-resize"
                              : handle === "ne"
                                ? "-right-3 -top-3 cursor-nesw-resize"
                                : handle === "sw"
                                  ? "-bottom-3 -left-3 cursor-nesw-resize"
                                  : "-bottom-3 -right-3 cursor-nwse-resize"
                          }`}
                          key={handle}
                          onPointerCancel={endDrag}
                          onPointerDown={beginResize(handle)}
                          onPointerMove={handlePointerMove}
                          onPointerUp={endDrag}
                          role="button"
                          tabIndex={-1}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </div>

          <aside className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 sm:p-8">
            <h2 className="text-lg font-semibold text-white">Crop options</h2>

            {image ? (
              <div className="mt-6 grid gap-5">
                <div>
                  <span className="text-sm font-semibold text-white">Aspect ratio</span>
                  <div className="mt-2 grid grid-cols-4 gap-2" role="group" aria-label="Aspect ratio presets">
                    {aspectPresets.map((preset) => (
                      <button
                        aria-pressed={aspectPreset === preset.id}
                        className={`rounded-xl border py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                          aspectPreset === preset.id
                            ? "border-violet-300/70 bg-violet-400/10 text-violet-200"
                            : "border-white/10 bg-white/[0.04] text-slate-200 hover:border-violet-300/40 hover:bg-white/[0.08]"
                        }`}
                        disabled={isBusy}
                        key={preset.id}
                        onClick={() => applyAspectPreset(preset.id)}
                        type="button"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#080b1a]/70 p-4 text-sm leading-6 text-slate-300">
                  Crop size:{" "}
                  <span className="font-semibold text-white">
                    {cropRect ? `${cropWidth} × ${cropHeight} px` : "—"}
                  </span>
                </div>

                <p className="text-xs leading-5 text-slate-500">
                  Drag inside the box to move it, or drag a corner handle to resize.
                </p>
              </div>
            ) : (
              <p className="mt-4 text-sm leading-6 text-slate-400">Add an image to select the area to crop.</p>
            )}

            <button
              className="mt-5 w-full rounded-full bg-gradient-to-r from-[#4F46E5] via-[#06B6D4] to-[#14B8A6] px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:shadow-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              disabled={!image || !cropRect || isBusy}
              onClick={runCrop}
              type="button"
            >
              {phase === "processing" ? "Cropping..." : "Crop Image"}
            </button>

            <div className="mt-5 space-y-3">
              {phase === "preparing" ? <ProcessingState subtitle="Reading your image" title="Preparing" /> : null}
              {phase === "processing" ? (
                <ProcessingState subtitle="Cropping locally in your browser" title="Processing" />
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
