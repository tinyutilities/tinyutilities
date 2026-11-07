"use client";

import { useRef, useState } from "react";
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
import { needsOrientationBakeIn, stripImageMetadata } from "@/lib/image/strip-metadata";
import type { MetadataGroup } from "@/lib/image/metadata";
import { detectImageFormat } from "@/lib/image/format";

const acceptedTypes = ["image/jpeg", "image/png", "image/webp"];
const maxFileSize = 100 * 1024 * 1024;
const defaultFilenameBase = "TinyUtility-cleaned";

function loadExifr() {
  return import("exifr").then((module) => module.default);
}

type LoadedImage = {
  file: File;
  bytes: Uint8Array;
  format: "jpeg" | "png" | "webp";
  previewUrl: string;
  width: number;
  height: number;
};

type ViewState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; hasAnyMetadata: boolean; hasGps: boolean; groups: MetadataGroup[] };

type CleanResult = {
  blob: Blob;
  mimeType: string;
  extension: string;
  removed: string[];
  reencoded: boolean;
  width: number;
  height: number;
  verifiedClean: boolean;
  verifyGroups: MetadataGroup[];
};

function extensionFor(format: "jpeg" | "png" | "webp") {
  return format === "jpeg" ? "jpg" : format;
}

function mimeFor(format: "jpeg" | "png" | "webp") {
  return format === "jpeg" ? "image/jpeg" : `image/${format}`;
}

/** Orientation 5-8 involve a 90°/270° turn, which swaps the canvas's width and height. */
function isSwappedOrientation(orientation: number) {
  return orientation >= 5 && orientation <= 8;
}

function applyOrientationTransform(context: CanvasRenderingContext2D, orientation: number, width: number, height: number) {
  switch (orientation) {
    case 2:
      context.transform(-1, 0, 0, 1, width, 0);
      break;
    case 3:
      context.transform(-1, 0, 0, -1, width, height);
      break;
    case 4:
      context.transform(1, 0, 0, -1, 0, height);
      break;
    case 5:
      context.transform(0, 1, 1, 0, 0, 0);
      break;
    case 6:
      context.transform(0, 1, -1, 0, height, 0);
      break;
    case 7:
      context.transform(0, -1, -1, 0, height, width);
      break;
    case 8:
      context.transform(0, -1, 1, 0, 0, width);
      break;
    default:
      break;
  }
}

async function reencodeWithOrientation(file: File, orientation: number, rawDimensions: { width: number; height: number } | null, mimeType: string): Promise<Blob> {
  // Browsers disagree on whether createImageBitmap's `imageOrientation: "none"` is honoured, so
  // rather than trust that option, decode normally and check the result against the JPEG's own
  // SOF dimensions (ground truth, unaffected by orientation): if they already differ the way
  // this orientation implies, the browser already rotated the bitmap for us, and applying the
  // transform again would rotate it right back out.
  const bitmap = await createImageBitmap(file);
  const swapped = isSwappedOrientation(orientation);
  const expectedRawAspectMatches = rawDimensions ? bitmap.width === rawDimensions.width && bitmap.height === rawDimensions.height : true;
  const alreadyOriented = swapped && !expectedRawAspectMatches;

  const canvas = document.createElement("canvas");
  canvas.width = alreadyOriented ? bitmap.width : swapped ? bitmap.height : bitmap.width;
  canvas.height = alreadyOriented ? bitmap.height : swapped ? bitmap.width : bitmap.height;

  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Could not prepare this image in your browser.");
  }

  if (!alreadyOriented) {
    applyOrientationTransform(context, orientation, bitmap.width, bitmap.height);
  }
  context.drawImage(bitmap, 0, 0);
  bitmap.close();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Your browser could not export this image."))), mimeType, 0.95);
  });
}

export function ImageMetadataTool() {
  const downloadedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [image, setImage] = useState<LoadedImage | null>(null);
  const [view, setView] = useState<ViewState | null>(null);
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<CleanResult | null>(null);
  const [filenameBase, setFilenameBase] = useState(defaultFilenameBase);
  const [justDownloaded, setJustDownloaded] = useState(false);

  const isBusy = phase === "preparing" || phase === "processing";
  const showSuccessHero = phase === "completed" && result !== null;

  const addFile = async (fileList: FileList | File[]) => {
    const file = Array.from(fileList)[0];
    if (!file) return;

    setResult(null);
    setErrorMessage(null);
    setImage(null);
    setView(null);

    if (!acceptedTypes.includes(file.type) && !["jpg", "jpeg", "png", "webp"].includes(file.name.split(".").pop()?.toLowerCase() ?? "")) {
      setPhase("error");
      setErrorMessage("Please choose a JPEG, PNG, or WebP image.");
      return;
    }

    if (file.size > maxFileSize) {
      setPhase("error");
      setErrorMessage(`This image is ${formatBytes(file.size)}. The limit is ${formatBytes(maxFileSize)}.`);
      return;
    }

    setPhase("preparing");

    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const format = detectImageFormat(bytes);

      if (!format) {
        setPhase("error");
        setErrorMessage("This doesn't look like a JPEG, PNG, or WebP file. Its contents don't match any of those formats.");
        return;
      }

      const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const probe = new window.Image();
        probe.onload = () => {
          resolve({ width: probe.naturalWidth, height: probe.naturalHeight });
        };
        probe.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error("This file could not be opened as an image. It may be corrupted."));
        };
        probe.src = url;
      });

      const previewUrl = URL.createObjectURL(file);
      setImage({ file, bytes, format, previewUrl, width: dimensions.width, height: dimensions.height });
      setFilenameBase(defaultFilenameBase);
      setPhase("idle");
      setView({ status: "loading" });

      const exifr = await loadExifr();
      const { readImageMetadata } = await import("@/lib/image/metadata");
      const metadataResult = await readImageMetadata(exifr, bytes);
      setView(
        metadataResult.ok
          ? { status: "ready", hasAnyMetadata: metadataResult.hasAnyMetadata, hasGps: metadataResult.hasGps, groups: metadataResult.groups }
          : { status: "error", message: metadataResult.error },
      );
    } catch (error) {
      setPhase("error");
      setErrorMessage(error instanceof Error ? error.message : "This file could not be read.");
    }
  };

  const clearAll = () => {
    if (image) URL.revokeObjectURL(image.previewUrl);
    setImage(null);
    setView(null);
    setPhase("idle");
    setErrorMessage(null);
    setResult(null);
    setJustDownloaded(false);
  };

  const backToViewing = () => {
    setResult(null);
    setPhase("idle");
    setJustDownloaded(false);
  };

  const runClean = async () => {
    if (!image) return;

    setErrorMessage(null);
    setPhase("processing");

    try {
      const exifr = await loadExifr();
      const { readImageMetadata, readRawOrientation } = await import("@/lib/image/metadata");
      const { readJpegPixelDimensions } = await import("@/lib/image/jpeg-segments");

      const orientation = image.format === "jpeg" ? await readRawOrientation(exifr, image.bytes) : undefined;
      const mustReencode = needsOrientationBakeIn(image.format, orientation);

      let outputBytes: Uint8Array;
      let removed: string[];

      if (mustReencode && orientation !== undefined) {
        const rawDimensions = readJpegPixelDimensions(image.bytes);
        const reencodedBlob = await reencodeWithOrientation(image.file, orientation, rawDimensions, mimeFor(image.format));
        outputBytes = new Uint8Array(await reencodedBlob.arrayBuffer());
        // Re-encoding already dropped every marker segment (canvas export never carries EXIF),
        // so there's nothing left to strip, but running it anyway keeps the reported list honest
        // about PNG/WebP-style ancillary data this path could theoretically still carry.
        const stripped = stripImageMetadata(outputBytes);
        outputBytes = stripped.bytes;
        removed = ["EXIF/orientation data (image was re-encoded upright)"];
      } else {
        const stripped = stripImageMetadata(image.bytes);
        outputBytes = stripped.bytes;
        removed = stripped.removed;
      }

      const mimeType = mustReencode ? mimeFor(image.format) : image.file.type || mimeFor(image.format);
      const blob = new Blob([outputBytes as Uint8Array<ArrayBuffer>], { type: mimeType });

      // Read the actual output's own dimensions back, rather than computing them separately and
      // risking a mismatch — this is what a real viewer would show for this exact file.
      const outputBitmap = await createImageBitmap(blob);
      const width = outputBitmap.width;
      const height = outputBitmap.height;
      outputBitmap.close();

      // Verify by re-reading the actual output bytes, the same way a real viewer would see them —
      // never just assume the strip worked.
      const verify = await readImageMetadata(exifr, outputBytes);
      const verifyGroups = verify.ok ? verify.groups : [];
      const verifiedClean = verify.ok && !verify.hasAnyMetadata;

      setResult({
        blob,
        mimeType,
        extension: extensionFor(image.format),
        removed,
        reencoded: mustReencode,
        width,
        height,
        verifiedClean,
        verifyGroups,
      });
      setFilenameBase(`${image.file.name.replace(/\.[^.]+$/, "") || "image"}-cleaned`);
      setPhase("completed");
    } catch (error) {
      setPhase("error");
      setErrorMessage(error instanceof Error ? error.message : "Could not clean this image's metadata. Please try again.");
    }
  };

  const markDownloaded = () => {
    setJustDownloaded(true);
    if (downloadedTimeoutRef.current) clearTimeout(downloadedTimeoutRef.current);
    downloadedTimeoutRef.current = setTimeout(() => setJustDownloaded(false), 3000);
  };

  const downloadResult = () => {
    if (!result) return;
    const url = URL.createObjectURL(result.blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = buildDownloadFilename(filenameBase, result.extension, defaultFilenameBase);
    link.click();
    URL.revokeObjectURL(url);
    markDownloaded();
  };

  return (
    <section className="mt-16 space-y-6">
      <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-5 text-sm font-medium leading-6 text-cyan-100">
        Your image never leaves your device. Metadata is inspected and cleared entirely in your browser.
      </div>

      {showSuccessHero && result ? (
        <SuccessCard
          beforeActions={<FilenameField extension={result.extension} onChange={setFilenameBase} value={filenameBase} />}
          downloadLabel="Download Image"
          heroStat={{ label: "Fields removed", value: String(result.removed.length) }}
          justDownloaded={justDownloaded}
          onDownload={downloadResult}
          onReset={clearAll}
          resetLabel="Clean Another Image"
          stats={[
            { label: "Dimensions", value: `${result.width} × ${result.height} px` },
            { label: "File size", value: formatBytes(result.blob.size) },
            { label: "Verified clean", value: result.verifiedClean ? "Yes" : "Metadata remains" },
            ...(result.reencoded ? [{ label: "Note", value: "Re-encoded to keep it upright", span: true }] : []),
          ]}
          subtitle="Metadata was cleared and the result was re-checked below."
          title="Metadata Cleared"
        >
          <button className="mx-auto block text-sm font-medium text-cyan-300 transition hover:text-cyan-100" onClick={backToViewing} type="button">
            Back to this image
          </button>

          <div className="mt-6 space-y-3 text-left">
            <p className="text-sm font-semibold text-white">What was removed</p>
            {result.removed.length > 0 ? (
              <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">
                {result.removed.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-400">No metadata was found to remove.</p>
            )}
            <p className="text-xs text-slate-500">
              {result.reencoded
                ? "This JPEG had a non-default orientation, so it was redrawn upright and re-encoded — the only case this tool recompresses pixels, so appearance is preserved without the orientation tag. Quality loss from this single re-encode is minimal but real."
                : "The image data itself was never decoded or re-encoded — only metadata segments/chunks were removed, so pixels are unchanged."}
            </p>
            {result.verifyGroups.length > 0 ? (
              <p className="text-sm text-amber-200" role="alert">
                Some metadata could not be removed by this tool and is still present in the downloaded file — see the fields above.
              </p>
            ) : null}
          </div>
        </SuccessCard>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 sm:p-8">
            {!image ? (
              <UploadCard
                accept="image/jpeg,image/png,image/webp"
                disabled={isBusy}
                formatsLabel="JPEG, PNG, and WebP"
                helperText={`Maximum ${formatBytes(maxFileSize)}.`}
                onFiles={(files) => void addFile(files)}
              />
            ) : (
              <>
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div className="flex min-w-0 items-start gap-4">
                    {/* eslint-disable-next-line @next/next/no-img-element -- Local object URL, not optimizable by next/image. */}
                    <img alt="" className="size-16 shrink-0 rounded-xl object-cover ring-1 ring-white/10" src={image.previewUrl} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{image.file.name}</p>
                      <p className="mt-1 text-sm text-slate-400">
                        {image.width} × {image.height} px · {formatBytes(image.file.size)} · {image.format.toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <button
                    className="shrink-0 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-white/30 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isBusy}
                    onClick={clearAll}
                    type="button"
                  >
                    Choose a different image
                  </button>
                </div>

                <div className="mt-6">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">Detected metadata</h2>

                  {view?.status === "loading" ? <p className="mt-4 text-sm text-slate-400">Reading metadata…</p> : null}
                  {view?.status === "error" ? (
                    <p className="mt-4 text-sm text-amber-200" role="alert">
                      {view.message}
                    </p>
                  ) : null}

                  {view?.status === "ready" ? (
                    view.hasAnyMetadata ? (
                      <div className="mt-4 space-y-5">
                        {view.hasGps ? (
                          <p className="rounded-xl border border-red-300/30 bg-red-300/10 p-4 text-sm text-red-100" role="alert">
                            This image contains the exact location where it was taken.
                          </p>
                        ) : null}
                        {view.groups.map((group) => (
                          <div key={group.title}>
                            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{group.title}</h3>
                            <dl className="mt-2 space-y-1.5">
                              {group.fields.map((field) => (
                                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5" key={field.label}>
                                  <dt className="text-sm text-slate-400">{field.label}</dt>
                                  <dd className={`break-all text-right text-sm font-medium ${field.sensitive ? "text-amber-200" : "text-white"}`}>
                                    {field.value}
                                  </dd>
                                </div>
                              ))}
                            </dl>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-4 text-sm text-slate-400">No readable metadata was found in this file.</p>
                    )
                  ) : null}

                  <p className="mt-5 text-xs text-slate-500">
                    This shows the metadata this tool can reliably read: camera, date, GPS, and a few image fields. It does not guarantee a
                    file has no other embedded data (custom app data, hidden layers, or formats this tool doesn&apos;t parse).
                  </p>
                </div>
              </>
            )}
          </div>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 sm:p-8">
              <h2 className="text-lg font-semibold text-white">Clean metadata</h2>
              <p className="mt-4 text-sm leading-6 text-slate-400">
                {image
                  ? "Removes camera, date, GPS, and other identifying metadata from this image. For JPEG, PNG, and WebP, this is done by removing the metadata segments/chunks directly — your image's pixels are not decoded or recompressed, unless the photo needs to be redrawn upright first (see below)."
                  : "Add an image to inspect and clean its metadata."}
              </p>

              <button
                className="mt-6 w-full rounded-full bg-gradient-to-r from-teal-500 via-cyan-500 to-emerald-400 px-6 py-3 text-sm font-semibold text-[#04120f] shadow-xl shadow-teal-500/20 transition hover:-translate-y-0.5 hover:shadow-teal-500/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                disabled={!image || isBusy || view?.status === "loading"}
                onClick={() => void runClean()}
                type="button"
              >
                {phase === "processing" ? "Cleaning…" : "Clean Metadata"}
              </button>

              <div className="mt-5 space-y-3">
                {phase === "preparing" ? <ProcessingState subtitle="Reading your image" title="Preparing" /> : null}
                {phase === "processing" ? <ProcessingState subtitle="Clearing metadata locally" title="Cleaning" /> : null}
                {phase === "error" && errorMessage ? <ErrorCard message={errorMessage} title="Something went wrong" /> : null}
              </div>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}
