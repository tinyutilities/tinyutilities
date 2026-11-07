"use client";

import { useRef, useState } from "react";
import { ErrorCard, formatBytes, ProcessingState, UploadCard } from "@/components/upload";
import type { UploadPhase } from "@/components/upload";
import { CopyButton } from "@/components/tools/tool-ui";
import { defaultPaletteOptions, extractPalette, maxColorCount, minColorCount, type PaletteColor } from "@/lib/image/palette";

const acceptedTypes = ["image/jpeg", "image/png", "image/webp"];
const maxFileSize = 100 * 1024 * 1024;
/** Longest side the image is downscaled to before analysis — plenty for a representative
 *  palette, and keeps a huge source photo from making quantization slow. */
const analysisMaxDimension = 200;

type SourceImage = { file: File; bitmap: ImageBitmap; previewUrl: string };

function downscaledImageData(bitmap: ImageBitmap): ImageData {
  const scale = Math.min(1, analysisMaxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: true, willReadFrequently: true });
  if (!context) throw new Error("Could not prepare this image in your browser.");

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "medium";
  context.drawImage(bitmap, 0, 0, width, height);
  return context.getImageData(0, 0, width, height);
}

function relativeLuminance(rgb: { r: number; g: number; b: number }): number {
  return 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;
}

export function ImagePaletteTool() {
  const [source, setSource] = useState<SourceImage | null>(null);
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [colorCount, setColorCount] = useState(defaultPaletteOptions.colorCount);
  const [colors, setColors] = useState<PaletteColor[] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const isBusy = phase === "preparing" || phase === "processing";

  const runExtraction = async (image: SourceImage, count: number) => {
    const requestId = ++requestIdRef.current;
    setPhase("processing");
    setErrorMessage(null);
    setNotice(null);

    try {
      const imageData = downscaledImageData(image.bitmap);
      const result = extractPalette(imageData.data, imageData.width, imageData.height, { colorCount: count, alphaThreshold: 16 });

      if (requestId !== requestIdRef.current) return; // a newer request superseded this one

      if (!result.ok) {
        setPhase("error");
        setErrorMessage(result.error);
        setColors(null);
        return;
      }

      setColors(result.colors);
      if (result.colors.length < count) {
        setNotice(`This image only has ${result.colors.length} distinct color${result.colors.length === 1 ? "" : "s"}, so that's all that's shown.`);
      }
      if (result.transparentPixels > 0) {
        const percent = Math.round((result.transparentPixels / (result.transparentPixels + result.consideredPixels)) * 100);
        setNotice((current) => {
          const transparencyNote = `${percent}% of this image is transparent and was excluded from the palette.`;
          return current ? `${current} ${transparencyNote}` : transparencyNote;
        });
      }
      setPhase("idle");
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      setPhase("error");
      setErrorMessage(error instanceof Error ? error.message : "Could not extract a palette from this image.");
    }
  };

  const addFile = async (fileList: FileList | File[]) => {
    const file = Array.from(fileList)[0];
    if (!file) return;

    setColors(null);
    setErrorMessage(null);
    setNotice(null);
    setSource(null);

    if (!acceptedTypes.includes(file.type)) {
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
      const bitmap = await createImageBitmap(file);
      const image = { file, bitmap, previewUrl: URL.createObjectURL(file) };
      setSource(image);
      await runExtraction(image, colorCount);
    } catch {
      setPhase("error");
      setErrorMessage("This file couldn't be read. It may be corrupted or not a valid image.");
    }
  };

  const clearAll = () => {
    if (source) {
      URL.revokeObjectURL(source.previewUrl);
      source.bitmap.close();
    }
    setSource(null);
    setColors(null);
    setPhase("idle");
    setErrorMessage(null);
    setNotice(null);
  };

  const changeColorCount = (next: number) => {
    setColorCount(next);
    if (source) void runExtraction(source, next);
  };

  return (
    <section className="mt-16 space-y-6">
      <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-5 text-sm font-medium leading-6 text-cyan-100">
        Your image never leaves your device. The palette is extracted entirely in your browser.
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 sm:p-8">
        {!source ? (
          <UploadCard
            accept="image/jpeg,image/png,image/webp"
            disabled={isBusy}
            formatsLabel="JPEG, PNG, and WebP"
            helperText={`Maximum ${formatBytes(maxFileSize)}.`}
            onFiles={(files) => void addFile(files)}
          />
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div className="flex min-w-0 items-start gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element -- Local object URL, not optimizable by next/image. */}
                <img alt="" className="size-20 shrink-0 rounded-xl object-cover ring-1 ring-white/10" src={source.previewUrl} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{source.file.name}</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {source.bitmap.width} × {source.bitmap.height} px · {formatBytes(source.file.size)}
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

            <div>
              <label className="text-sm font-semibold text-white" htmlFor="palette-count-slider">
                Number of colors: {colorCount}
              </label>
              <input
                className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isBusy}
                id="palette-count-slider"
                max={maxColorCount}
                min={minColorCount}
                onChange={(event) => changeColorCount(Number(event.target.value))}
                type="range"
                value={colorCount}
              />
            </div>

            {phase === "processing" ? <ProcessingState subtitle="Analyzing pixels locally" title="Extracting palette" /> : null}
            {phase === "error" && errorMessage ? <ErrorCard message={errorMessage} title="Could not extract a palette" /> : null}

            {colors && colors.length > 0 ? (
              <div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {colors.map((color) => {
                    const isLight = relativeLuminance(color.rgb) > 140;
                    return (
                      <div
                        className="flex flex-col justify-between gap-3 rounded-2xl border border-white/10 p-4"
                        key={color.hex}
                        style={{ backgroundColor: color.hex }}
                      >
                        <span className={`text-xs font-semibold uppercase tracking-[0.1em] ${isLight ? "text-black/60" : "text-white/70"}`}>
                          {Math.round(color.population * 100)}%
                        </span>
                        <div>
                          <p className={`font-mono text-sm font-semibold ${isLight ? "text-black" : "text-white"}`}>{color.hex}</p>
                          <p className={`font-mono text-xs ${isLight ? "text-black/70" : "text-white/80"}`}>
                            rgb({color.rgb.r}, {color.rgb.g}, {color.rgb.b})
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <CopyButton label="Copy all as HEX" text={colors.map((color) => color.hex).join("\n")} />
                  <CopyButton label="Copy as CSS variables" text={colors.map((color, index) => `--palette-${index + 1}: ${color.hex};`).join("\n")} />
                </div>
                {notice ? (
                  <p className="mt-4 text-sm text-slate-400" role="status">
                    {notice}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-xs leading-5 text-slate-400">
        Colors are found with median-cut quantization on the image downscaled to at most {analysisMaxDimension}px on its longest side — this
        gives a representative palette, not an exact count of every unique pixel color in the original file. Fully or mostly transparent areas
        are excluded.
      </div>
    </section>
  );
}
