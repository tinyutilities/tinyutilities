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
import { buildHtmlSnippet, buildIco, buildWebManifest, icoSizes, parseIco, standalonePngSizes } from "@/lib/image/favicon";

const acceptedTypes = ["image/jpeg", "image/png", "image/webp"];
const maxFileSize = 100 * 1024 * 1024;
const defaultFilenameBase = "TinyUtility-favicon";

function loadFflate() {
  return import("fflate");
}

type SourceImage = { file: File; bitmap: ImageBitmap; previewUrl: string };

type GeneratedFavicon = {
  zipBlob: Blob;
  icoEntryCount: number;
  pngCount: number;
  previews: Array<{ size: number; label: string; dataUrl: string }>;
};

function canvasToPng(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        reject(new Error("Your browser could not export this image."));
        return;
      }
      resolve(new Uint8Array(await blob.arrayBuffer()));
    }, "image/png");
  });
}

/** Draws the source bitmap, center-cropped to a square, at `size`×`size` with high-quality
 *  downscaling — favicons must be square, so a non-square source is cropped rather than
 *  stretched (stretching would distort it). */
function renderSquare(bitmap: ImageBitmap, size: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) throw new Error("Could not prepare this image in your browser.");

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  const cropSize = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - cropSize) / 2;
  const sy = (bitmap.height - cropSize) / 2;
  context.drawImage(bitmap, sx, sy, cropSize, cropSize, 0, 0, size, size);
  return canvas;
}

export function FaviconGeneratorTool() {
  const downloadedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [source, setSource] = useState<SourceImage | null>(null);
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [siteName, setSiteName] = useState("My Site");
  const [result, setResult] = useState<GeneratedFavicon | null>(null);
  const [filenameBase, setFilenameBase] = useState(defaultFilenameBase);
  const [justDownloaded, setJustDownloaded] = useState(false);

  const isBusy = phase === "preparing" || phase === "processing";
  const showSuccessHero = phase === "completed" && result !== null;

  const addFile = async (fileList: FileList | File[]) => {
    const file = Array.from(fileList)[0];
    if (!file) return;

    setResult(null);
    setErrorMessage(null);
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
      setSource({ file, bitmap, previewUrl: URL.createObjectURL(file) });
      setFilenameBase(defaultFilenameBase);
      setPhase("idle");
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
    setPhase("idle");
    setErrorMessage(null);
    setResult(null);
    setJustDownloaded(false);
  };

  const backToEditing = () => {
    setResult(null);
    setPhase("idle");
    setJustDownloaded(false);
  };

  const runGenerate = async () => {
    if (!source) return;

    setErrorMessage(null);
    setPhase("processing");

    try {
      const allSizes = [...new Set([...icoSizes, ...standalonePngSizes.map((entry) => entry.size)])].sort((a, b) => a - b);
      const pngBySize = new Map<number, Uint8Array>();
      const previews: GeneratedFavicon["previews"] = [];

      for (const size of allSizes) {
        const canvas = renderSquare(source.bitmap, size);
        const png = await canvasToPng(canvas);
        pngBySize.set(size, png);

        const standalone = standalonePngSizes.find((entry) => entry.size === size);
        if (standalone || icoSizes.includes(size as (typeof icoSizes)[number])) {
          previews.push({ size, label: standalone?.purpose ?? `${size}×${size}`, dataUrl: canvas.toDataURL("image/png") });
        }
      }

      const icoBytes = buildIco(icoSizes.map((size) => ({ png: pngBySize.get(size)! })));

      // Validate the file this tool is about to offer for download, rather than assuming a
      // successful canvas export means a correct ICO: parse it back and check its own structure.
      const parsed = parseIco(icoBytes);
      if (parsed.count !== icoSizes.length || !parsed.entries.every((entry) => entry.isValidPng)) {
        throw new Error("The generated favicon.ico failed its own validity check. Please try a different image.");
      }

      const manifest = buildWebManifest(siteName);
      const snippet = buildHtmlSnippet();

      const files: Record<string, Uint8Array> = {
        "favicon.ico": icoBytes,
        "site.webmanifest": new TextEncoder().encode(manifest),
        "head-snippet.html": new TextEncoder().encode(snippet),
      };
      for (const entry of standalonePngSizes) {
        files[entry.filename] = pngBySize.get(entry.size)!;
      }

      const fflate = await loadFflate();
      const zipped = fflate.zipSync(files, { level: 6 });

      setResult({
        zipBlob: new Blob([zipped as Uint8Array<ArrayBuffer>], { type: "application/zip" }),
        icoEntryCount: parsed.count,
        pngCount: standalonePngSizes.length,
        previews,
      });
      setFilenameBase(`${source.file.name.replace(/\.[^.]+$/, "") || "favicon"}-favicon`);
      setPhase("completed");
    } catch (error) {
      setPhase("error");
      setErrorMessage(error instanceof Error ? error.message : "Could not generate the favicon package. Please try again.");
    }
  };

  const markDownloaded = () => {
    setJustDownloaded(true);
    if (downloadedTimeoutRef.current) clearTimeout(downloadedTimeoutRef.current);
    downloadedTimeoutRef.current = setTimeout(() => setJustDownloaded(false), 3000);
  };

  const downloadResult = () => {
    if (!result) return;
    const url = URL.createObjectURL(result.zipBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = buildDownloadFilename(filenameBase, "zip", defaultFilenameBase);
    link.click();
    URL.revokeObjectURL(url);
    markDownloaded();
  };

  return (
    <section className="mt-16 space-y-6">
      <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-5 text-sm font-medium leading-6 text-cyan-100">
        Your image never leaves your device. Every favicon size is rendered locally in your browser.
      </div>

      {showSuccessHero && result ? (
        <SuccessCard
          beforeActions={<FilenameField extension="zip" onChange={setFilenameBase} value={filenameBase} />}
          downloadLabel="Download ZIP"
          heroStat={{ label: "Files in package", value: String(result.pngCount + 3) }}
          justDownloaded={justDownloaded}
          onDownload={downloadResult}
          onReset={clearAll}
          resetLabel="Generate Another Favicon"
          stats={[
            { label: "Sizes in favicon.ico", value: String(result.icoEntryCount) },
            { label: "Standalone PNGs", value: String(result.pngCount) },
            { label: "ZIP size", value: formatBytes(result.zipBlob.size) },
          ]}
          subtitle="Your favicon package is ready, and its ICO structure has been verified."
          title="Favicon Package Ready"
        >
          <button className="mx-auto block text-sm font-medium text-teal-300 transition hover:text-teal-100" onClick={backToEditing} type="button">
            Change the site name
          </button>

          <div className="mt-6 grid grid-cols-3 gap-4 sm:grid-cols-5">
            {result.previews.map((preview) => (
              <div className="text-center" key={preview.size}>
                <div className="mx-auto grid size-14 place-items-center rounded-xl bg-[repeating-conic-gradient(#33384a_0%_25%,transparent_0%_50%)] bg-[length:10px_10px] p-1.5 ring-1 ring-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element -- Local data URL, not optimizable by next/image. */}
                  <img alt={`${preview.size}×${preview.size} preview`} className="size-full object-contain" src={preview.dataUrl} />
                </div>
                <p className="mt-1.5 text-xs text-slate-400">
                  {preview.size}×{preview.size}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-6 text-left text-xs text-slate-500">
            Unzip the package into your site&apos;s root and add the contents of head-snippet.html to your page&apos;s <code className="font-mono">&lt;head&gt;</code>.
          </p>
        </SuccessCard>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 sm:p-8">
            {!source ? (
              <UploadCard
                accept="image/jpeg,image/png,image/webp"
                disabled={isBusy}
                formatsLabel="JPEG, PNG, and WebP"
                helperText={`A square image works best. Maximum ${formatBytes(maxFileSize)}.`}
                onFiles={(files) => void addFile(files)}
              />
            ) : (
              <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
                <div className="mx-auto grid size-28 shrink-0 place-items-center rounded-2xl bg-[repeating-conic-gradient(#33384a_0%_25%,transparent_0%_50%)] bg-[length:14px_14px] p-2 ring-1 ring-white/10 sm:mx-0">
                  {/* eslint-disable-next-line @next/next/no-img-element -- Local object URL, not optimizable by next/image. */}
                  <img alt="" className="size-full rounded-lg object-contain" src={source.previewUrl} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{source.file.name}</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {source.bitmap.width} × {source.bitmap.height} px · {formatBytes(source.file.size)}
                  </p>
                  {source.bitmap.width !== source.bitmap.height ? (
                    <p className="mt-2 text-xs text-amber-200">This image isn&apos;t square, so it will be cropped to a centered square first.</p>
                  ) : null}
                  <button
                    className="mt-4 rounded-full border border-red-300/25 px-4 py-2 text-xs font-semibold text-red-200 transition hover:border-red-200/50 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-300/50 disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={isBusy}
                    onClick={clearAll}
                    type="button"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}
          </div>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 sm:p-8">
              <h2 className="text-lg font-semibold text-white">Favicon package</h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Produces favicon.ico ({icoSizes.join(", ")}px), {standalonePngSizes.map((entry) => `${entry.filename}`).join(", ")}, a
                site.webmanifest, and the HTML snippet to reference them all.
              </p>

              <label className="mt-5 block text-left" htmlFor="favicon-site-name">
                <span className="text-sm font-semibold text-white">Site name (for the web manifest)</span>
                <input
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#080b1a] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
                  id="favicon-site-name"
                  maxLength={60}
                  onChange={(event) => setSiteName(event.target.value)}
                  type="text"
                  value={siteName}
                />
              </label>

              <button
                className="mt-6 w-full rounded-full bg-gradient-to-r from-teal-500 via-cyan-500 to-emerald-400 px-6 py-3 text-sm font-semibold text-[#04120f] shadow-xl shadow-teal-500/20 transition hover:-translate-y-0.5 hover:shadow-teal-500/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                disabled={!source || isBusy}
                onClick={() => void runGenerate()}
                type="button"
              >
                {phase === "processing" ? "Generating…" : "Generate Favicon"}
              </button>

              <div className="mt-5 space-y-3">
                {phase === "preparing" ? <ProcessingState subtitle="Reading your image" title="Preparing" /> : null}
                {phase === "processing" ? <ProcessingState subtitle="Rendering every size locally" title="Generating" /> : null}
                {phase === "error" && errorMessage ? <ErrorCard message={errorMessage} title="Something went wrong" /> : null}
              </div>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}
