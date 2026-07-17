"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type UploadedImage = {
  id: string;
  file: File;
  previewUrl: string;
  width: number;
  height: number;
};

type CompressedImage = {
  id: string;
  sourceId: string;
  filename: string;
  downloadName: string;
  previewUrl: string;
  blob: Blob;
  originalSize: number;
  compressedSize: number;
  width: number;
  height: number;
  format: OutputMimeType;
};

type CompressionFailure = {
  id: string;
  filename: string;
  reason: string;
};

type OutputFormat = "original" | "image/jpeg" | "image/png" | "image/webp";
type OutputMimeType = Exclude<OutputFormat, "original">;
type ToolStatus = "empty" | "loading" | "success" | "error";

const acceptedTypes = ["image/jpeg", "image/png", "image/webp"];
const maxFileSize = 100 * 1024 * 1024;
const defaultMessage = "Add JPG, PNG, or WEBP images to compress them locally.";
const compressionQuotes = [
  "Tiny pixels, big savings.",
  "Compressing... your storage will thank you.",
  "Almost there...",
  "Making your images lighter...",
  "TinyUtility is working its magic...",
];

const outputOptions: Array<[OutputFormat, string]> = [
  ["original", "Keep Original"],
  ["image/jpeg", "JPEG"],
  ["image/png", "PNG"],
  ["image/webp", "WebP"],
];

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

function getOutputMimeType(file: File, outputFormat: OutputFormat): OutputMimeType {
  if (outputFormat !== "original") {
    return outputFormat;
  }

  return acceptedTypes.includes(file.type) ? (file.type as OutputMimeType) : "image/jpeg";
}

function getCompressedFilename(filename: string, mimeType: OutputMimeType) {
  const extension = extensionByMimeType[mimeType];
  const baseName = filename.replace(/\.[^/.]+$/, "") || "image";

  return `${baseName}_compressed_tinyutility.${extension}`;
}

function getSavings(originalSize: number, compressedSize: number) {
  return Math.max(originalSize - compressedSize, 0);
}

function getReduction(originalSize: number, compressedSize: number) {
  if (originalSize === 0) {
    return 0;
  }

  return Math.max(Math.round((1 - compressedSize / originalSize) * 100), 0);
}

function getRandomQuote() {
  const index = Math.floor(Math.random() * compressionQuotes.length);

  return compressionQuotes[index];
}

function createImageRecord(file: File): Promise<UploadedImage> {
  return new Promise((resolve, reject) => {
    const previewUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      resolve({
        id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
        file,
        previewUrl,
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    };

    image.onerror = () => {
      URL.revokeObjectURL(previewUrl);
      reject(new Error(`Could not read ${file.name}.`));
    };

    image.src = previewUrl;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: OutputMimeType, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }

        reject(new Error("Your browser could not export this image."));
      },
      mimeType,
      quality,
    );
  });
}

async function compressImage(
  image: UploadedImage,
  outputFormat: OutputFormat,
  quality: number,
  resizeEnabled: boolean,
  resizeWidth: number,
) {
  const bitmap = await createImageBitmap(image.file);
  const targetMimeType = getOutputMimeType(image.file, outputFormat);
  const width = resizeEnabled && resizeWidth > 0 ? Math.max(1, Math.round(resizeWidth)) : bitmap.width;
  const height = resizeEnabled && resizeWidth > 0
    ? Math.max(1, Math.round((bitmap.height / bitmap.width) * width))
    : bitmap.height;
  const canvas = document.createElement("canvas");

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d", { alpha: targetMimeType !== "image/jpeg" });

  if (!context) {
    bitmap.close();
    throw new Error("Could not prepare this image for compression.");
  }

  if (targetMimeType === "image/jpeg") {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
  }

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await canvasToBlob(canvas, targetMimeType, quality / 100);

  return {
    blob,
    width,
    height,
    format: targetMimeType,
  };
}

function encodeText(value: string) {
  return new TextEncoder().encode(value);
}

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc ^= byte;

    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function writeUint16(bytes: number[], value: number) {
  bytes.push(value & 0xff, (value >>> 8) & 0xff);
}

function writeUint32(bytes: number[], value: number) {
  bytes.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
}

function getZipDateParts(date: Date) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const day = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();

  return { time, day };
}

function toArrayBuffer(bytes: Uint8Array) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function createZipArchive(files: CompressedImage[]) {
  const fileParts: Uint8Array[] = [];
  const centralDirectoryParts: Uint8Array[] = [];
  let offset = 0;
  const { time, day } = getZipDateParts(new Date());

  for (const file of files) {
    const data = new Uint8Array(await file.blob.arrayBuffer());
    const filename = encodeText(file.downloadName);
    const checksum = crc32(data);
    const localHeader: number[] = [];
    const centralHeader: number[] = [];

    writeUint32(localHeader, 0x04034b50);
    writeUint16(localHeader, 20);
    writeUint16(localHeader, 0x0800);
    writeUint16(localHeader, 0);
    writeUint16(localHeader, time);
    writeUint16(localHeader, day);
    writeUint32(localHeader, checksum);
    writeUint32(localHeader, data.length);
    writeUint32(localHeader, data.length);
    writeUint16(localHeader, filename.length);
    writeUint16(localHeader, 0);

    const localPart = new Uint8Array(localHeader.length + filename.length + data.length);
    localPart.set(localHeader);
    localPart.set(filename, localHeader.length);
    localPart.set(data, localHeader.length + filename.length);
    fileParts.push(localPart);

    writeUint32(centralHeader, 0x02014b50);
    writeUint16(centralHeader, 20);
    writeUint16(centralHeader, 20);
    writeUint16(centralHeader, 0x0800);
    writeUint16(centralHeader, 0);
    writeUint16(centralHeader, time);
    writeUint16(centralHeader, day);
    writeUint32(centralHeader, checksum);
    writeUint32(centralHeader, data.length);
    writeUint32(centralHeader, data.length);
    writeUint16(centralHeader, filename.length);
    writeUint16(centralHeader, 0);
    writeUint16(centralHeader, 0);
    writeUint16(centralHeader, 0);
    writeUint16(centralHeader, 0);
    writeUint32(centralHeader, 0);
    writeUint32(centralHeader, offset);

    const centralPart = new Uint8Array(centralHeader.length + filename.length);
    centralPart.set(centralHeader);
    centralPart.set(filename, centralHeader.length);
    centralDirectoryParts.push(centralPart);

    offset += localPart.length;
  }

  const centralDirectorySize = centralDirectoryParts.reduce((total, part) => total + part.length, 0);
  const endHeader: number[] = [];

  writeUint32(endHeader, 0x06054b50);
  writeUint16(endHeader, 0);
  writeUint16(endHeader, 0);
  writeUint16(endHeader, files.length);
  writeUint16(endHeader, files.length);
  writeUint32(endHeader, centralDirectorySize);
  writeUint32(endHeader, offset);
  writeUint16(endHeader, 0);

  const zipParts = [...fileParts, ...centralDirectoryParts, new Uint8Array(endHeader)].map(toArrayBuffer);

  return new Blob(zipParts, {
    type: "application/zip",
  });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.download = filename;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

export function ImageCompressorTool() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imagesRef = useRef<UploadedImage[]>([]);
  const resultsRef = useRef<CompressedImage[]>([]);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [results, setResults] = useState<CompressedImage[]>([]);
  const [failures, setFailures] = useState<CompressionFailure[]>([]);
  const [quality, setQuality] = useState(75);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("original");
  const [resizeEnabled, setResizeEnabled] = useState(false);
  const [resizeWidth, setResizeWidth] = useState(1200);
  const [status, setStatus] = useState<ToolStatus>("empty");
  const [message, setMessage] = useState(defaultMessage);
  const [progress, setProgress] = useState(0);
  const [quote, setQuote] = useState(compressionQuotes[0]);

  const totalSize = useMemo(
    () => images.reduce((total, image) => total + image.file.size, 0),
    [images],
  );
  const calculatedHeight = useMemo(() => {
    const firstImage = images[0];

    if (!firstImage || !resizeEnabled || resizeWidth <= 0) {
      return null;
    }

    return Math.max(1, Math.round((firstImage.height / firstImage.width) * resizeWidth));
  }, [images, resizeEnabled, resizeWidth]);
  const transparencyWarning = images.some((image) => {
    const targetFormat = getOutputMimeType(image.file, outputFormat);

    return targetFormat === "image/jpeg" && (image.file.type === "image/png" || image.file.type === "image/webp");
  });
  const imageCountLabel = images.length === 1 ? "1 image selected" : `${images.length} images selected`;
  const statusColor =
    status === "error" ? "text-red-300" : status === "success" ? "text-teal-300" : "text-slate-400";

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    resultsRef.current = results;
  }, [results]);

  useEffect(() => {
    return () => {
      imagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
      resultsRef.current.forEach((result) => URL.revokeObjectURL(result.previewUrl));
    };
  }, []);

  const clearResults = () => {
    results.forEach((result) => URL.revokeObjectURL(result.previewUrl));
    setResults([]);
    setFailures([]);
    setProgress(0);
  };

  const addFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    const unsupportedFiles = files.filter((file) => !acceptedTypes.includes(file.type));
    const oversizedFiles = files.filter((file) => acceptedTypes.includes(file.type) && file.size > maxFileSize);
    const validFiles = files.filter((file) => acceptedTypes.includes(file.type) && file.size <= maxFileSize);

    clearResults();

    if (validFiles.length === 0) {
      setStatus("error");
      setMessage(
        oversizedFiles.length > 0
          ? "Each image must be 100 MB or smaller."
          : "Please choose JPG, PNG, or WEBP images.",
      );
      return;
    }

    setStatus("loading");
    setMessage("Loading images...");

    try {
      const nextImages = await Promise.all(validFiles.map(createImageRecord));

      setImages((currentImages) => [...currentImages, ...nextImages]);
      setStatus("success");
      setMessage([
        `${nextImages.length} image${nextImages.length === 1 ? "" : "s"} added.`,
        unsupportedFiles.length > 0 ? "Unsupported files were skipped." : "",
        oversizedFiles.length > 0 ? "Files over 100 MB were skipped." : "",
      ].filter(Boolean).join(" "));
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Could not load one of the selected images.");
    }
  };

  const removeImage = (id: string) => {
    clearResults();
    setImages((currentImages) => {
      const image = currentImages.find((item) => item.id === id);

      if (image) {
        URL.revokeObjectURL(image.previewUrl);
      }

      const nextImages = currentImages.filter((item) => item.id !== id);

      if (nextImages.length === 0) {
        setStatus("empty");
        setMessage(defaultMessage);
      }

      return nextImages;
    });
  };

  const clearImages = () => {
    clearResults();
    images.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    setImages([]);
    setStatus("empty");
    setMessage(defaultMessage);
  };

  const compressImages = async () => {
    if (images.length === 0) {
      setStatus("error");
      setMessage("Add at least one image before compressing.");
      return;
    }

    clearResults();
    setStatus("loading");
    setMessage("Compressing images locally...");
    setQuote(getRandomQuote());

    const nextResults: CompressedImage[] = [];
    const nextFailures: CompressionFailure[] = [];

    for (const [index, image] of images.entries()) {
      try {
        const compressed = await compressImage(image, outputFormat, quality, resizeEnabled, resizeWidth);
        const previewUrl = URL.createObjectURL(compressed.blob);

        nextResults.push({
          id: `${image.id}-compressed`,
          sourceId: image.id,
          filename: image.file.name,
          downloadName: getCompressedFilename(image.file.name, compressed.format),
          previewUrl,
          blob: compressed.blob,
          originalSize: image.file.size,
          compressedSize: compressed.blob.size,
          width: compressed.width,
          height: compressed.height,
          format: compressed.format,
        });
      } catch (error) {
        nextFailures.push({
          id: image.id,
          filename: image.file.name,
          reason: error instanceof Error ? error.message : "Compression failed for this image.",
        });
      } finally {
        setProgress(Math.round(((index + 1) / images.length) * 100));
      }
    }

    setResults(nextResults);
    setFailures(nextFailures);

    if (nextResults.length > 0 && nextFailures.length > 0) {
      setStatus("error");
      setMessage(`${nextResults.length} image${nextResults.length === 1 ? "" : "s"} compressed. Some images failed.`);
      return;
    }

    if (nextResults.length > 0) {
      setStatus("success");
      setMessage(`${nextResults.length} image${nextResults.length === 1 ? "" : "s"} compressed successfully.`);
      return;
    }

    setStatus("error");
    setMessage("No images could be compressed. Try smaller files or a different output format.");
  };

  const downloadAll = async () => {
    if (results.length === 0) {
      setStatus("error");
      setMessage("Compress images before downloading a ZIP.");
      return;
    }

    try {
      const zipBlob = await createZipArchive(results);

      downloadBlob(zipBlob, "tinyutility-compressed-images.zip");
      setStatus("success");
      setMessage("ZIP downloaded successfully.");
    } catch {
      setStatus("error");
      setMessage("Could not create the ZIP archive. Try downloading images individually.");
    }
  };

  return (
    <section className="mt-16 space-y-6">
      <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-5 text-sm font-medium leading-6 text-cyan-100">
        Images are compressed entirely in your browser. Nothing is uploaded.
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 sm:p-8">
          <div
            className="rounded-2xl border border-dashed border-cyan-300/35 bg-[#080b1a]/70 p-8 text-center transition hover:border-cyan-200/60"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              void addFiles(event.dataTransfer.files);
            }}
          >
            <p className="text-lg font-semibold text-white">Drop images here</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              JPG, JPEG, PNG, and WEBP images are supported. Maximum 100 MB per image.
            </p>
            <button
              className="mt-6 rounded-full bg-gradient-to-r from-[#4F46E5] via-[#06B6D4] to-[#14B8A6] px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:shadow-cyan-500/30 focus:outline-none focus:ring-2 focus:ring-cyan-300/50"
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              Browse Images
            </button>
            <input
              accept="image/jpeg,image/png,image/webp"
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
              <p className="text-sm font-semibold text-white">{imageCountLabel}</p>
              {images.length > 0 ? (
                <p className="mt-1 text-sm text-slate-400">Total input size: {formatBytes(totalSize)}</p>
              ) : null}
            </div>
            <button
              className="rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-white/30 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={images.length === 0 || status === "loading"}
              onClick={clearImages}
              type="button"
            >
              Clear all
            </button>
          </div>

          {images.length > 0 ? (
            <div className="mt-6 grid gap-4">
              {images.map((image) => (
                <article
                  className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:grid-cols-[96px_1fr_auto]"
                  key={image.id}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- Local object URLs cannot be optimized by next/image. */}
                  <img
                    alt={`Preview of ${image.file.name}`}
                    className="h-24 w-24 rounded-xl object-cover ring-1 ring-white/10"
                    src={image.previewUrl}
                  />
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-white">{image.file.name}</h3>
                    <p className="mt-2 text-sm text-slate-400">
                      {image.width} x {image.height} px - {formatBytes(image.file.size)}
                    </p>
                  </div>
                  <div className="flex items-center sm:justify-end">
                    <button
                      className="rounded-full border border-red-300/25 px-3 py-2 text-xs font-semibold text-red-200 transition hover:border-red-200/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={status === "loading"}
                      onClick={() => removeImage(image.id)}
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
              No images selected yet.
            </div>
          )}
        </div>

        <aside className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 sm:p-8">
          <h2 className="text-lg font-semibold text-white">Compression options</h2>
          <div className="mt-6 grid gap-5">
            <label className="block" htmlFor="compression-quality">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-semibold text-white">Compression quality</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-semibold text-cyan-200">
                  {quality}
                </span>
              </div>
              <input
                className="mt-4 w-full accent-cyan-300"
                id="compression-quality"
                max="100"
                min="1"
                onChange={(event) => setQuality(Number(event.target.value))}
                type="range"
                value={quality}
              />
            </label>

            <SelectField
              label="Output format"
              onChange={(value) => setOutputFormat(value as OutputFormat)}
              options={outputOptions}
              value={outputFormat}
            />

            {transparencyWarning ? (
              <p className="rounded-2xl border border-yellow-300/20 bg-yellow-300/10 p-4 text-sm leading-6 text-yellow-100">
                JPEG does not preserve transparency. Transparent areas will be flattened onto a white background.
              </p>
            ) : null}

            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#080b1a]/70 px-4 py-3 text-sm text-slate-200 transition hover:border-cyan-300/30">
              <span className="font-semibold text-white">Resize images</span>
              <input
                checked={resizeEnabled}
                className="size-4 accent-cyan-300"
                onChange={() => setResizeEnabled((currentValue) => !currentValue)}
                type="checkbox"
              />
            </label>

            {resizeEnabled ? (
              <div className="rounded-2xl border border-white/10 bg-[#080b1a]/70 p-4">
                <label className="block" htmlFor="resize-width">
                  <span className="text-sm font-semibold text-white">Width</span>
                  <input
                    className="mt-3 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/40 focus:bg-white/[0.07] focus:ring-2 focus:ring-cyan-300/20"
                    id="resize-width"
                    min="1"
                    onChange={(event) => setResizeWidth(Number(event.target.value))}
                    type="number"
                    value={resizeWidth}
                  />
                </label>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Height is calculated automatically for each image to preserve its aspect ratio
                  {calculatedHeight ? ` (${resizeWidth} x ${calculatedHeight} px for the first image).` : "."}
                </p>
              </div>
            ) : null}
          </div>

          <button
            className="mt-6 w-full rounded-full bg-gradient-to-r from-[#4F46E5] via-[#06B6D4] to-[#14B8A6] px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:shadow-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            disabled={images.length === 0 || status === "loading"}
            onClick={compressImages}
            type="button"
          >
            {status === "loading" ? "Compressing..." : "Compress Images"}
          </button>

          <div className="mt-5">
            {status === "loading" ? (
              <p className="mb-3 text-sm font-medium text-cyan-100">{quote}</p>
            ) : null}
            <div
              aria-label={`Image compression progress: ${progress}%`}
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
              {message}
            </p>
          </div>

          {results.length > 0 ? (
            <button
              className="mt-5 w-full rounded-full border border-cyan-300/25 bg-cyan-300/10 px-6 py-3 text-center text-sm font-semibold text-cyan-100 transition hover:-translate-y-0.5 hover:border-cyan-200/50 hover:bg-cyan-300/15"
              onClick={downloadAll}
              type="button"
            >
              Download All (ZIP)
            </button>
          ) : null}
        </aside>
      </div>

      {failures.length > 0 ? (
        <div className="rounded-3xl border border-red-300/20 bg-red-300/10 p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-white">Could not compress</h2>
          <div className="mt-4 grid gap-3">
            {failures.map((failure) => (
              <p className="rounded-2xl border border-red-300/15 bg-[#080b1a]/60 p-4 text-sm text-red-100" key={failure.id}>
                <span className="font-semibold">{failure.filename}:</span> {failure.reason}
              </p>
            ))}
          </div>
        </div>
      ) : null}

      {results.length > 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 sm:p-8">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-xl font-semibold text-white">Compressed images</h2>
              <p className="mt-2 text-sm text-slate-400">
                Download images individually or save every successful result as a ZIP.
              </p>
            </div>
            <button
              className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-5 py-2.5 text-sm font-semibold text-cyan-100 transition hover:border-cyan-200/50 hover:bg-cyan-300/15"
              onClick={downloadAll}
              type="button"
            >
              Download All (ZIP)
            </button>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {results.map((result) => {
              const originalImage = images.find((image) => image.id === result.sourceId);
              const saved = getSavings(result.originalSize, result.compressedSize);
              const reduction = getReduction(result.originalSize, result.compressedSize);

              return (
                <article className="rounded-2xl border border-white/10 bg-[#080b1a]/70 p-4" key={result.id}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {originalImage ? (
                      <figure>
                        {/* eslint-disable-next-line @next/next/no-img-element -- Local object URLs cannot be optimized by next/image. */}
                        <img
                          alt={`Original preview of ${result.filename}`}
                          className="h-40 w-full rounded-xl object-cover ring-1 ring-white/10"
                          src={originalImage.previewUrl}
                        />
                        <figcaption className="mt-2 text-xs font-medium text-slate-400">Original</figcaption>
                      </figure>
                    ) : null}
                    <figure>
                      {/* eslint-disable-next-line @next/next/no-img-element -- Local object URLs cannot be optimized by next/image. */}
                      <img
                        alt={`Compressed preview of ${result.filename}`}
                        className="h-40 w-full rounded-xl object-cover ring-1 ring-white/10"
                        src={result.previewUrl}
                      />
                      <figcaption className="mt-2 text-xs font-medium text-slate-400">Compressed</figcaption>
                    </figure>
                  </div>

                  <h3 className="mt-4 truncate text-sm font-semibold text-white">{result.filename}</h3>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <ResultStat label="Original size" value={formatBytes(result.originalSize)} />
                    <ResultStat label="Compressed size" value={formatBytes(result.compressedSize)} />
                    <ResultStat label="Space saved" value={formatBytes(saved)} />
                    <ResultStat label="Reduction" value={`${reduction}%`} />
                    <ResultStat label="Resolution" value={`${result.width} x ${result.height}`} />
                    <ResultStat label="Output format" value={labelByMimeType[result.format]} />
                  </dl>
                  <button
                    className="mt-5 w-full rounded-full border border-cyan-300/25 bg-cyan-300/10 px-5 py-2.5 text-sm font-semibold text-cyan-100 transition hover:-translate-y-0.5 hover:border-cyan-200/50 hover:bg-cyan-300/15"
                    onClick={() => downloadBlob(result.blob, result.downloadName)}
                    type="button"
                  >
                    Download
                  </button>
                </article>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}

type SelectFieldProps = {
  label: string;
  value: string;
  options: Array<[string, string]>;
  onChange: (value: string) => void;
};

function SelectField({ label, value, options, onChange }: SelectFieldProps) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-white">{label}</span>
      <select
        className="mt-2 w-full rounded-xl border border-white/10 bg-[#080b1a] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

type ResultStatProps = {
  label: string;
  value: string;
};

function ResultStat({ label, value }: ResultStatProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold text-white">{value}</dd>
    </div>
  );
}
