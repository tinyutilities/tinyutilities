"use client";

import { PDFDocument } from "pdf-lib";
import { useEffect, useMemo, useRef, useState } from "react";

type UploadedImage = {
  id: string;
  file: File;
  previewUrl: string;
  width: number;
  height: number;
};

type PageSize = "a4" | "letter";
type Orientation = "portrait" | "landscape";
type MarginSize = "none" | "small" | "medium";
type ConverterStatus = "empty" | "loading" | "success" | "error";

const acceptedTypes = ["image/jpeg", "image/png", "image/webp"];
const pageSizes: Record<PageSize, [number, number]> = {
  a4: [595.28, 841.89],
  letter: [612, 792],
};
const margins: Record<MarginSize, number> = {
  none: 0,
  small: 24,
  medium: 48,
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

function getPageDimensions(size: PageSize, orientation: Orientation) {
  const [width, height] = pageSizes[size];
  return orientation === "landscape" ? [height, width] : [width, height];
}

function getFit(imageWidth: number, imageHeight: number, pageWidth: number, pageHeight: number, margin: number) {
  const availableWidth = pageWidth - margin * 2;
  const availableHeight = pageHeight - margin * 2;
  const scale = Math.min(availableWidth / imageWidth, availableHeight / imageHeight, 1);
  const width = imageWidth * scale;
  const height = imageHeight * scale;

  return {
    width,
    height,
    x: (pageWidth - width) / 2,
    y: (pageHeight - height) / 2,
  };
}

async function convertWebpToPngBytes(file: File) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;

  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Could not prepare this WEBP image.");
  }

  context.drawImage(bitmap, 0, 0);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) {
    throw new Error("Could not convert this WEBP image.");
  }

  return blob.arrayBuffer();
}

export function ImageToPdfTool() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imagesRef = useRef<UploadedImage[]>([]);
  const downloadUrlRef = useRef<string | null>(null);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [pageSize, setPageSize] = useState<PageSize>("a4");
  const [orientation, setOrientation] = useState<Orientation>("portrait");
  const [margin, setMargin] = useState<MarginSize>("small");
  const [status, setStatus] = useState<ConverterStatus>("empty");
  const [message, setMessage] = useState("Add JPG, PNG, or WEBP images to create a PDF.");
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const imageCountLabel = images.length === 1 ? "1 image selected" : `${images.length} images selected`;
  const totalSize = useMemo(
    () => images.reduce((total, image) => total + image.file.size, 0),
    [images],
  );

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    downloadUrlRef.current = downloadUrl;
  }, [downloadUrl]);

  useEffect(() => {
    return () => {
      imagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
      if (downloadUrlRef.current) {
        URL.revokeObjectURL(downloadUrlRef.current);
      }
    };
  }, []);

  const resetDownload = () => {
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }
  };

  const addFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    const validFiles = files.filter((file) => acceptedTypes.includes(file.type));

    resetDownload();

    if (validFiles.length === 0) {
      setStatus("error");
      setMessage("Please choose JPG, PNG, or WEBP images.");
      return;
    }

    setStatus("loading");
    setMessage("Loading images...");

    try {
      const nextImages = await Promise.all(validFiles.map(createImageRecord));
      setImages((currentImages) => [...currentImages, ...nextImages]);
      setStatus("success");
      setMessage(`${nextImages.length} image${nextImages.length === 1 ? "" : "s"} added.`);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Could not load one of the selected images.");
    }
  };

  const removeImage = (id: string) => {
    resetDownload();
    setImages((currentImages) => {
      const image = currentImages.find((item) => item.id === id);
      if (image) {
        URL.revokeObjectURL(image.previewUrl);
      }

      const nextImages = currentImages.filter((item) => item.id !== id);
      if (nextImages.length === 0) {
        setStatus("empty");
        setMessage("Add JPG, PNG, or WEBP images to create a PDF.");
      }

      return nextImages;
    });
  };

  const clearImages = () => {
    resetDownload();
    images.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    setImages([]);
    setProgress(0);
    setStatus("empty");
    setMessage("Add JPG, PNG, or WEBP images to create a PDF.");
  };

  const moveImage = (index: number, direction: -1 | 1) => {
    resetDownload();
    setImages((currentImages) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= currentImages.length) {
        return currentImages;
      }

      const nextImages = [...currentImages];
      [nextImages[index], nextImages[nextIndex]] = [nextImages[nextIndex], nextImages[index]];
      return nextImages;
    });
  };

  const convertToPdf = async () => {
    if (images.length === 0) {
      setStatus("error");
      setMessage("Add at least one image before converting.");
      return;
    }

    resetDownload();
    setStatus("loading");
    setProgress(0);
    setMessage("Creating PDF locally...");

    try {
      const pdfDoc = await PDFDocument.create();
      const [pageWidth, pageHeight] = getPageDimensions(pageSize, orientation);
      const pageMargin = margins[margin];

      for (const [index, image] of images.entries()) {
        const imageBytes =
          image.file.type === "image/webp"
            ? await convertWebpToPngBytes(image.file)
            : await image.file.arrayBuffer();
        const embeddedImage =
          image.file.type === "image/png" || image.file.type === "image/webp"
            ? await pdfDoc.embedPng(imageBytes)
            : await pdfDoc.embedJpg(imageBytes);
        const page = pdfDoc.addPage([pageWidth, pageHeight]);
        const fit = getFit(image.width, image.height, pageWidth, pageHeight, pageMargin);

        page.drawImage(embeddedImage, fit);
        setProgress(Math.round(((index + 1) / images.length) * 100));
      }

      const pdfBytes = await pdfDoc.save();
      const pdfArrayBuffer = pdfBytes.buffer.slice(
        pdfBytes.byteOffset,
        pdfBytes.byteOffset + pdfBytes.byteLength,
      ) as ArrayBuffer;
      const blob = new Blob([pdfArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      setDownloadUrl(url);
      setStatus("success");
      setMessage(`PDF created successfully (${formatBytes(blob.size)}).`);
    } catch {
      setStatus("error");
      setProgress(0);
      setMessage("Could not create the PDF. Try fewer images or smaller files.");
    }
  };

  const statusColor =
    status === "error" ? "text-red-300" : status === "success" ? "text-teal-300" : "text-slate-400";

  return (
    <section className="mt-16 space-y-6">
      <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-5 text-sm font-medium leading-6 text-cyan-100">
        Files never leave your device. Everything happens locally inside your browser.
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
              JPG, JPEG, PNG, and WEBP images are supported. Add as many as your browser can handle.
            </p>
            <button
              className="mt-6 rounded-full bg-gradient-to-r from-[#4F46E5] via-[#06B6D4] to-[#14B8A6] px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:shadow-cyan-500/30"
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
              {images.map((image, index) => (
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
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <button
                      className="rounded-full border border-white/15 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-cyan-300/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={index === 0 || status === "loading"}
                      onClick={() => moveImage(index, -1)}
                      type="button"
                    >
                      Up
                    </button>
                    <button
                      className="rounded-full border border-white/15 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-cyan-300/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={index === images.length - 1 || status === "loading"}
                      onClick={() => moveImage(index, 1)}
                      type="button"
                    >
                      Down
                    </button>
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
          <h2 className="text-lg font-semibold text-white">PDF options</h2>
          <div className="mt-6 grid gap-5">
            <SelectField
              label="Page size"
              onChange={(value) => setPageSize(value as PageSize)}
              options={[
                ["a4", "A4"],
                ["letter", "Letter"],
              ]}
              value={pageSize}
            />
            <SelectField
              label="Orientation"
              onChange={(value) => setOrientation(value as Orientation)}
              options={[
                ["portrait", "Portrait"],
                ["landscape", "Landscape"],
              ]}
              value={orientation}
            />
            <SelectField
              label="Margins"
              onChange={(value) => setMargin(value as MarginSize)}
              options={[
                ["none", "None"],
                ["small", "Small"],
                ["medium", "Medium"],
              ]}
              value={margin}
            />
            <div className="rounded-2xl border border-white/10 bg-[#080b1a]/70 p-4 text-sm leading-6 text-slate-300">
              Aspect ratio is preserved automatically, and images are never upscaled.
            </div>
          </div>

          <button
            className="mt-6 w-full rounded-full bg-gradient-to-r from-[#4F46E5] via-[#06B6D4] to-[#14B8A6] px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:shadow-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            disabled={images.length === 0 || status === "loading"}
            onClick={convertToPdf}
            type="button"
          >
            {status === "loading" ? "Converting..." : "Convert to PDF"}
          </button>

          <div className="mt-5">
            <div
              aria-label={`PDF conversion progress: ${progress}%`}
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

          {downloadUrl ? (
            <a
              className="mt-5 block rounded-full border border-cyan-300/25 bg-cyan-300/10 px-6 py-3 text-center text-sm font-semibold text-cyan-100 transition hover:-translate-y-0.5 hover:border-cyan-200/50 hover:bg-cyan-300/15"
              download="tinyutility-images.pdf"
              href={downloadUrl}
            >
              Download PDF
            </a>
          ) : null}
        </aside>
      </div>
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
