"use client";

import {
  clip,
  closePath,
  endPath,
  lineTo,
  moveTo,
  PDFDocument,
  popGraphicsState,
  pushGraphicsState,
} from "pdf-lib";
import { useEffect, useMemo, useRef, useState } from "react";
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

type UploadedImage = {
  id: string;
  file: File;
  previewUrl: string;
  width: number;
  height: number;
};

type PageSize = "a4" | "letter" | "match";
type Orientation = "portrait" | "landscape" | "auto";
type MarginSize = "none" | "small" | "medium";
type ImageFit = "fit" | "fill";

const acceptedTypes = ["image/jpeg", "image/png", "image/webp"];
const fixedPageSizes: Record<Exclude<PageSize, "match">, [number, number]> = {
  a4: [595.28, 841.89],
  letter: [612, 792],
};
const margins: Record<MarginSize, number> = {
  none: 0,
  small: 24,
  medium: 48,
};
/** Treat one CSS pixel as one PDF point when a page is sized to match its source image. */
const PIXELS_TO_POINTS = 0.75;

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

/** Resolves the page's [width, height] in points for one image, honoring "match" size and "auto" orientation. */
function getPageDimensions(size: PageSize, orientation: Orientation, image: UploadedImage) {
  if (size === "match") {
    return [image.width * PIXELS_TO_POINTS, image.height * PIXELS_TO_POINTS];
  }

  const [width, height] = fixedPageSizes[size];
  const isLandscape =
    orientation === "landscape" || (orientation === "auto" && image.width > image.height);

  return isLandscape ? [height, width] : [width, height];
}

/** "fit" (contain, never crops) vs "fill" (cover, crops to fill the margin box) placement for an image. */
function getPlacement(
  imageWidth: number,
  imageHeight: number,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  fit: ImageFit,
) {
  const availableWidth = pageWidth - margin * 2;
  const availableHeight = pageHeight - margin * 2;
  const containScale = Math.min(availableWidth / imageWidth, availableHeight / imageHeight, 1);
  const coverScale = Math.max(availableWidth / imageWidth, availableHeight / imageHeight);
  const scale = fit === "fill" ? coverScale : containScale;
  const width = imageWidth * scale;
  const height = imageHeight * scale;

  return {
    width,
    height,
    x: (pageWidth - width) / 2,
    y: (pageHeight - height) / 2,
    clipBox: fit === "fill" ? { x: margin, y: margin, width: availableWidth, height: availableHeight } : null,
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

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.download = filename;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

export function ImageToPdfTool() {
  const imagesRef = useRef<UploadedImage[]>([]);
  const resultBlobRef = useRef<Blob | null>(null);
  const downloadedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [pageSize, setPageSize] = useState<PageSize>("a4");
  const [orientation, setOrientation] = useState<Orientation>("portrait");
  const [margin, setMargin] = useState<MarginSize>("small");
  const [imageFit, setImageFit] = useState<ImageFit>("fit");
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | undefined>(undefined);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [justDownloaded, setJustDownloaded] = useState(false);

  const imageCountLabel = images.length === 1 ? "1 image selected" : `${images.length} images selected`;
  const totalSize = useMemo(
    () => images.reduce((total, image) => total + image.file.size, 0),
    [images],
  );

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    resultBlobRef.current = resultBlob;
  }, [resultBlob]);

  useEffect(() => {
    return () => {
      imagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
      if (downloadedTimeoutRef.current) clearTimeout(downloadedTimeoutRef.current);
    };
  }, []);

  const resetResult = () => {
    setResultBlob(null);
    setProgress(undefined);
  };

  const addFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    const validFiles = files.filter((file) => acceptedTypes.includes(file.type));

    resetResult();
    setErrorMessage(null);

    if (validFiles.length === 0) {
      setPhase("error");
      setErrorMessage("Please choose JPG, PNG, or WEBP images.");
      return;
    }

    setPhase("preparing");

    try {
      const nextImages = await Promise.all(validFiles.map(createImageRecord));
      setImages((currentImages) => [...currentImages, ...nextImages]);
      setPhase("idle");
    } catch (error) {
      setPhase("error");
      setErrorMessage(error instanceof Error ? error.message : "Could not load one of the selected images.");
    }
  };

  const removeImage = (id: string) => {
    resetResult();
    setImages((currentImages) => {
      const image = currentImages.find((item) => item.id === id);
      if (image) {
        URL.revokeObjectURL(image.previewUrl);
      }

      const nextImages = currentImages.filter((item) => item.id !== id);
      if (nextImages.length === 0) {
        setPhase("idle");
      }

      return nextImages;
    });
  };

  const clearImages = () => {
    resetResult();
    images.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    setImages([]);
    setPhase("idle");
    setErrorMessage(null);
    setJustDownloaded(false);
  };

  const moveImage = (index: number, direction: -1 | 1) => {
    resetResult();
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
      setPhase("error");
      setErrorMessage("Add at least one image before converting.");
      return;
    }

    resetResult();
    setPhase("processing");
    setProgress(0);

    try {
      const pdfDoc = await PDFDocument.create();
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
        const [pageWidth, pageHeight] = getPageDimensions(pageSize, orientation, image);
        const page = pdfDoc.addPage([pageWidth, pageHeight]);
        const placement = getPlacement(image.width, image.height, pageWidth, pageHeight, pageMargin, imageFit);

        if (placement.clipBox) {
          const { x, y, width, height } = placement.clipBox;

          page.pushOperators(
            pushGraphicsState(),
            moveTo(x, y),
            lineTo(x + width, y),
            lineTo(x + width, y + height),
            lineTo(x, y + height),
            closePath(),
            clip(),
            endPath(),
          );
        }

        page.drawImage(embeddedImage, placement);

        if (placement.clipBox) {
          page.pushOperators(popGraphicsState());
        }

        setProgress(Math.round(((index + 1) / images.length) * 100));
      }

      const pdfBytes = await pdfDoc.save();
      const pdfArrayBuffer = pdfBytes.buffer.slice(
        pdfBytes.byteOffset,
        pdfBytes.byteOffset + pdfBytes.byteLength,
      ) as ArrayBuffer;
      const blob = new Blob([pdfArrayBuffer], { type: "application/pdf" });

      setResultBlob(blob);
      setPhase("completed");
    } catch {
      setPhase("error");
      setProgress(undefined);
      setErrorMessage("Could not create the PDF. Try fewer images or smaller files.");
    }
  };

  const markDownloaded = () => {
    setJustDownloaded(true);
    if (downloadedTimeoutRef.current) clearTimeout(downloadedTimeoutRef.current);
    downloadedTimeoutRef.current = setTimeout(() => setJustDownloaded(false), 3000);
  };

  const downloadPdf = () => {
    if (!resultBlob) return;
    downloadBlob(resultBlob, "tinyutility-images.pdf");
    markDownloaded();
  };

  const isBusy = phase === "preparing" || phase === "processing";
  const showSuccessHero = phase === "completed" && resultBlob;
  const pageSizeLabel = pageSize === "match" ? "Matches image" : pageSize.toUpperCase();
  const orientationLabel =
    orientation === "auto" ? "Auto" : orientation === "portrait" ? "Portrait" : "Landscape";

  return (
    <section className="mt-16 space-y-6">
      <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-5 text-sm font-medium leading-6 text-cyan-100">
        Files never leave your device. Everything happens locally inside your browser.
      </div>

      {showSuccessHero ? (
        <SuccessCard
          downloadLabel="Download PDF"
          justDownloaded={justDownloaded}
          onDownload={downloadPdf}
          heroStat={{ label: "File size", value: formatBytes(resultBlob.size) }}
          onReset={clearImages}
          stats={[
            { label: "Pages", value: `${images.length}` },
            { label: "Page size", value: pageSizeLabel },
            { label: "Orientation", value: orientationLabel },
          ]}
          subtitle="Your PDF is ready to download."
          title="File Ready"
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 sm:p-8">
            {images.length === 0 ? (
              <UploadCard
                accept="image/jpeg,image/png,image/webp"
                disabled={isBusy}
                formatsLabel="JPG, PNG, and WEBP"
                helperText="Add as many as your browser can handle."
                multiple
                onFiles={(files) => void addFiles(files)}
              />
            ) : (
              <UploadCard
                accept="image/jpeg,image/png,image/webp"
                compact
                disabled={isBusy}
                formatsLabel="JPG, PNG, and WEBP"
                multiple
                onFiles={(files) => void addFiles(files)}
              />
            )}

            <div className="mt-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-semibold text-white">{imageCountLabel}</p>
                {images.length > 0 ? (
                  <p className="mt-1 text-sm text-slate-400">Total input size: {formatBytes(totalSize)}</p>
                ) : null}
              </div>
              <button
                className="rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-white/30 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={images.length === 0 || isBusy}
                onClick={clearImages}
                type="button"
              >
                Clear all
              </button>
            </div>

            {images.length > 0 ? (
              <div className="mt-6 grid gap-3">
                {images.map((image, index) => (
                  <SelectedFileRow
                    actions={
                      <>
                        <button
                          aria-label={`Move ${image.file.name} earlier in the PDF`}
                          className="rounded-full border border-white/15 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-cyan-300/40 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-300/50 disabled:cursor-not-allowed disabled:opacity-40"
                          disabled={index === 0 || isBusy}
                          onClick={() => moveImage(index, -1)}
                          type="button"
                        >
                          Up
                        </button>
                        <button
                          aria-label={`Move ${image.file.name} later in the PDF`}
                          className="rounded-full border border-white/15 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-cyan-300/40 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-300/50 disabled:cursor-not-allowed disabled:opacity-40"
                          disabled={index === images.length - 1 || isBusy}
                          onClick={() => moveImage(index, 1)}
                          type="button"
                        >
                          Down
                        </button>
                        <button
                          aria-label={`Remove ${image.file.name}`}
                          className="rounded-full border border-red-300/25 px-3 py-2 text-xs font-semibold text-red-200 transition hover:border-red-200/50 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-300/50 disabled:cursor-not-allowed disabled:opacity-40"
                          disabled={isBusy}
                          onClick={() => removeImage(image.id)}
                          type="button"
                        >
                          Remove
                        </button>
                      </>
                    }
                    detail={`${image.width} x ${image.height} px`}
                    key={image.id}
                    name={image.file.name}
                    sizeLabel={formatBytes(image.file.size)}
                    thumbnailUrl={image.previewUrl}
                    typeLabel={image.file.type.replace("image/", "").toUpperCase()}
                  />
                ))}
              </div>
            ) : null}
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
                  ["match", "Match Image Size"],
                ]}
                value={pageSize}
              />
              <SelectField
                label="Orientation"
                onChange={(value) => setOrientation(value as Orientation)}
                options={[
                  ["portrait", "Portrait"],
                  ["landscape", "Landscape"],
                  ["auto", "Auto (per image)"],
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
              <SelectField
                label="Image fit"
                onChange={(value) => setImageFit(value as ImageFit)}
                options={[
                  ["fit", "Fit (show the whole image)"],
                  ["fill", "Fill (crop to fill the page)"],
                ]}
                value={imageFit}
              />
              <div className="rounded-2xl border border-white/10 bg-[#080b1a]/70 p-4 text-sm leading-6 text-slate-300">
                {imageFit === "fit"
                  ? "Aspect ratio is preserved automatically, and images are never upscaled."
                  : "Images are scaled to fill the page and cropped evenly on the longer side."}
              </div>
            </div>

            {images.length > 0 && !isBusy ? (
              <div className="mt-5">
                <EstimatePanel
                  items={[
                    { label: "Pages", value: `${images.length}` },
                    { label: "Page size", value: pageSizeLabel },
                    { label: "Orientation", value: orientationLabel },
                  ]}
                />
              </div>
            ) : null}

            <button
              className="mt-5 w-full rounded-full bg-gradient-to-r from-[#4F46E5] via-[#06B6D4] to-[#14B8A6] px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:shadow-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              disabled={images.length === 0 || isBusy}
              onClick={convertToPdf}
              type="button"
            >
              {phase === "processing" ? "Converting..." : "Convert to PDF"}
            </button>

            <div className="mt-5 space-y-3">
              {phase === "preparing" ? (
                <ProcessingState subtitle="Loading your images" title="Preparing" />
              ) : null}
              {phase === "processing" ? (
                <>
                  <ProcessingState subtitle="Building your PDF locally" title="Processing" />
                  <ProgressIndicator label="PDF creation progress" value={progress} />
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
