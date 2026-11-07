import { detectImageFormat, type ImageFormat } from "./format";
import { stripJpegMetadata } from "./jpeg-segments";
import { stripPngMetadata } from "./png-chunks";
import { stripWebpMetadata } from "./webp-chunks";

export type StripResult = {
  bytes: Uint8Array;
  format: ImageFormat;
  /** Human-readable list of what was actually found and removed (empty if nothing was). */
  removed: string[];
};

const jpegMarkerNames: Record<number, string> = { 0xe1: "EXIF/XMP data", 0xed: "Photoshop/IPTC data", 0xfe: "comment" };
const pngChunkNames: Record<string, string> = {
  tEXt: "text metadata",
  zTXt: "compressed text metadata",
  iTXt: "international text metadata",
  eXIf: "EXIF data",
  tIME: "last-modified timestamp",
};

/**
 * Removes metadata from a JPEG, PNG or WebP file without decoding or re-encoding the image
 * pixels, so the result is pixel-for-pixel identical to the input — see `jpeg-segments.ts`,
 * `png-chunks.ts` and `webp-chunks.ts` for exactly what each format strips and keeps.
 */
export function stripImageMetadata(input: Uint8Array): StripResult {
  const format = detectImageFormat(input);

  if (!format) {
    throw new Error("This doesn't look like a JPEG, PNG, or WebP file.");
  }

  if (format === "jpeg") {
    const { bytes, removedMarkers } = stripJpegMetadata(input);
    const removed = [...new Set(removedMarkers.map((marker) => jpegMarkerNames[marker] ?? `marker 0x${marker.toString(16)}`))];
    return { bytes, format, removed };
  }

  if (format === "png") {
    const { bytes, removedChunkTypes } = stripPngMetadata(input);
    const removed = [...new Set(removedChunkTypes.map((type) => pngChunkNames[type] ?? type))];
    return { bytes, format, removed };
  }

  const { bytes, removedChunkIds } = stripWebpMetadata(input);
  const removed = removedChunkIds.map((id) => (id === "XMP " ? "XMP data" : "EXIF data"));
  return { bytes, format, removed: [...new Set(removed)] };
}

/**
 * Whether the visible orientation needs to be baked into the pixels before metadata is removed.
 * Only JPEG's EXIF Orientation tag is honoured by browsers' own image decoders; stripping it from
 * a non-default-orientation JPEG would silently change how the file displays everywhere else, so
 * the tool re-encodes those (and only those) images via canvas instead of a lossless strip.
 * Orientation values: 1 = normal, 2-8 = various rotations/flips.
 */
export function needsOrientationBakeIn(format: ImageFormat, orientation: number | undefined): boolean {
  return format === "jpeg" && typeof orientation === "number" && orientation !== 1;
}
