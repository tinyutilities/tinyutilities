/**
 * Planning helpers for rendering PDF pages to images: how big to render each page, what to name
 * the files, and how to bundle them. Pure so the limits and names can be unit tested; the actual
 * canvas rendering lives in the tool component.
 */

export const dpiOptions = [72, 96, 150, 200, 300] as const;
export type Dpi = (typeof dpiOptions)[number];

export type ImageFormat = "png" | "jpeg" | "webp";

export const imageFormats: Array<{ value: ImageFormat; label: string; mimeType: string; extension: string; lossy: boolean }> = [
  { value: "png", label: "PNG (lossless)", mimeType: "image/png", extension: "png", lossy: false },
  { value: "jpeg", label: "JPEG (smaller)", mimeType: "image/jpeg", extension: "jpg", lossy: true },
  { value: "webp", label: "WebP (smallest)", mimeType: "image/webp", extension: "webp", lossy: true },
];

/** Longest side a rendered page may have, in pixels. Browsers cap canvas size well above this. */
export const maxRenderSide = 8192;
/** Most pixels a single rendered page may have (width × height). */
export const maxRenderPixels = 50_000_000;
/** Most combined image bytes held in memory before the export stops. */
export const maxTotalOutputBytes = 600 * 1024 * 1024;

export type RenderSize = { scale: number; width: number; height: number; clamped: boolean };

/**
 * Pixel size for rendering a page of `pageWidth` × `pageHeight` PDF points at `dpi`
 * (1 PDF point = 1/72 inch). Reduces the scale, and reports `clamped`, when the requested size
 * would exceed the side or pixel limits.
 */
export function computeRenderSize(pageWidth: number, pageHeight: number, dpi: number): RenderSize {
  let scale = dpi / 72;
  let width = pageWidth * scale;
  let height = pageHeight * scale;
  let clamped = false;

  const sideFactor = Math.max(width, height) / maxRenderSide;
  if (sideFactor > 1) {
    scale /= sideFactor;
    clamped = true;
  }

  const pixelFactor = (pageWidth * scale * pageHeight * scale) / maxRenderPixels;
  if (pixelFactor > 1) {
    scale /= Math.sqrt(pixelFactor);
    clamped = true;
  }

  width = Math.max(1, Math.floor(pageWidth * scale));
  height = Math.max(1, Math.floor(pageHeight * scale));

  return { scale, width, height, clamped };
}

/** "report-page-007.png" — numbers are zero-padded to the width of the page count so files sort correctly. */
export function imageFilename(base: string, pageNumber: number, totalPages: number, extension: string): string {
  const digits = Math.max(2, String(totalPages).length);
  return `${base}-page-${String(pageNumber).padStart(digits, "0")}.${extension}`;
}

export type ZipEntry = { name: string; data: Uint8Array };

/** Bundles already-compressed images into a ZIP without recompressing them (store only). */
export function zipImages(
  fflate: Pick<typeof import("fflate"), "zipSync">,
  entries: ZipEntry[],
): Uint8Array {
  const files: Record<string, Uint8Array> = {};

  for (const entry of entries) {
    if (entry.name in files) throw new Error(`Duplicate file name in ZIP: ${entry.name}`);
    files[entry.name] = entry.data;
  }

  return fflate.zipSync(files, { level: 0 });
}
