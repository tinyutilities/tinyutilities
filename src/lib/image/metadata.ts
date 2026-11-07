import { detectImageFormat } from "./format";
import { findWebpChunk } from "./webp-chunks";

/**
 * Reads image metadata with `exifr` (MIT, zero dependencies) and maps the handful of fields
 * people actually care about into plain-language groups. `exifr` itself can return dozens of
 * obscure, vendor-specific tags — this module deliberately shows only a curated allowlist rather
 * than exifr's raw output, so the viewer never confuses people with internal tag names they can't
 * interpret.
 */

/** Only the one function this module actually calls — matches both the named `exifr` module
 *  namespace and its default export, which test callers pass interchangeably. */
type ExifrModule = { parse: typeof import("exifr").parse };

export type MetadataField = { label: string; value: string; sensitive?: boolean };
export type MetadataGroup = { title: string; fields: MetadataField[] };

export type MetadataReadResult =
  | { ok: true; format: "jpeg" | "png" | "webp"; hasAnyMetadata: boolean; hasGps: boolean; groups: MetadataGroup[] }
  | { ok: false; error: string };

function formatExposureTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return String(seconds);
  if (seconds >= 1) return `${seconds}s`;
  const denominator = Math.round(1 / seconds);
  return `1/${denominator}s`;
}

function formatCoordinate(value: number, positiveSuffix: string, negativeSuffix: string): string {
  const suffix = value >= 0 ? positiveSuffix : negativeSuffix;
  return `${Math.abs(value).toFixed(6)}° ${suffix}`;
}

function formatDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");
  }
  return null;
}

/** Raw tag name → exifr's parsed value, as returned by `exifr.parse` with `mergeOutput: true`. */
type RawTags = Record<string, unknown>;

function buildGroups(tags: RawTags): { groups: MetadataGroup[]; hasGps: boolean } {
  const groups: MetadataGroup[] = [];
  let hasGps = false;

  const cameraFields: MetadataField[] = [];
  if (typeof tags.Make === "string") cameraFields.push({ label: "Camera make", value: tags.Make.trim() });
  if (typeof tags.Model === "string") cameraFields.push({ label: "Camera model", value: tags.Model.trim() });
  if (typeof tags.LensModel === "string") cameraFields.push({ label: "Lens", value: tags.LensModel.trim() });
  if (typeof tags.FNumber === "number") cameraFields.push({ label: "Aperture", value: `f/${tags.FNumber}` });
  if (typeof tags.ExposureTime === "number") cameraFields.push({ label: "Shutter speed", value: formatExposureTime(tags.ExposureTime) });
  if (typeof tags.ISO === "number") cameraFields.push({ label: "ISO", value: String(tags.ISO) });
  if (typeof tags.FocalLength === "number") cameraFields.push({ label: "Focal length", value: `${tags.FocalLength}mm` });
  if (typeof tags.Flash === "string") cameraFields.push({ label: "Flash", value: tags.Flash });
  if (cameraFields.length > 0) groups.push({ title: "Camera", fields: cameraFields });

  const dateFields: MetadataField[] = [];
  const taken = formatDate(tags.DateTimeOriginal) ?? formatDate(tags.CreateDate);
  const modified = formatDate(tags.ModifyDate);
  if (taken) dateFields.push({ label: "Date taken", value: taken });
  if (modified && modified !== taken) dateFields.push({ label: "Date modified", value: modified });
  if (dateFields.length > 0) groups.push({ title: "Date", fields: dateFields });

  const latitude = typeof tags.latitude === "number" ? tags.latitude : undefined;
  const longitude = typeof tags.longitude === "number" ? tags.longitude : undefined;
  if (latitude !== undefined && longitude !== undefined) {
    hasGps = true;
    const gpsFields: MetadataField[] = [
      { label: "Latitude", value: formatCoordinate(latitude, "N", "S"), sensitive: true },
      { label: "Longitude", value: formatCoordinate(longitude, "E", "W"), sensitive: true },
    ];
    if (typeof tags.GPSAltitude === "number") {
      gpsFields.push({ label: "Altitude", value: `${tags.GPSAltitude.toFixed(1)} m`, sensitive: true });
    }
    groups.push({ title: "Location (sensitive)", fields: gpsFields });
  }

  const imageFields: MetadataField[] = [];
  if (typeof tags.Orientation === "string") imageFields.push({ label: "Orientation", value: tags.Orientation });
  else if (typeof tags.Orientation === "number" && tags.Orientation !== 1) {
    imageFields.push({ label: "Orientation", value: `Rotated/flipped (code ${tags.Orientation})` });
  }
  if (typeof tags.Software === "string") imageFields.push({ label: "Software", value: tags.Software.trim(), sensitive: true });
  if (typeof tags.Artist === "string" && tags.Artist.trim()) imageFields.push({ label: "Artist", value: tags.Artist.trim(), sensitive: true });
  if (typeof tags.Copyright === "string" && tags.Copyright.trim()) imageFields.push({ label: "Copyright", value: tags.Copyright.trim() });
  if (imageFields.length > 0) groups.push({ title: "Image", fields: imageFields });

  return { groups, hasGps };
}

/** The raw, untranslated EXIF Orientation tag value (1-8), or undefined if absent — used to
 *  decide whether cleaning needs to bake the orientation into the pixels (see
 *  `needsOrientationBakeIn` in `strip-metadata.ts`), separately from the human-readable string
 *  `readImageMetadata` shows in the viewer. */
export async function readRawOrientation(exifr: ExifrModule, bytes: Uint8Array): Promise<number | undefined> {
  try {
    const tags = (await exifr.parse(bytes, { tiff: true, exif: false, gps: false, pick: ["Orientation"], translateValues: false, mergeOutput: true })) as
      | { Orientation?: number }
      | undefined;
    return typeof tags?.Orientation === "number" ? tags.Orientation : undefined;
  } catch {
    return undefined;
  }
}

export async function readImageMetadata(exifr: ExifrModule, bytes: Uint8Array): Promise<MetadataReadResult> {
  const format = detectImageFormat(bytes);

  if (!format) {
    return { ok: false, error: "This doesn't look like a JPEG, PNG, or WebP file." };
  }

  // exifr has no WebP support of its own (only JPEG/TIFF/HEIC/PNG/AVIF), so for WebP the EXIF
  // RIFF chunk's payload — itself a plain TIFF/EXIF buffer — is located first and handed to
  // exifr directly, rather than the whole WebP container.
  const exifSource = format === "webp" ? findWebpChunk(bytes, "EXIF") : bytes;

  if (format === "webp" && !exifSource) {
    return { ok: true, format, hasAnyMetadata: false, hasGps: false, groups: [] };
  }

  let tags: RawTags | undefined;

  try {
    tags = (await exifr.parse(exifSource!, {
      tiff: true,
      exif: true,
      gps: true,
      iptc: true,
      xmp: false,
      icc: false,
      jfif: false,
      interop: false,
      translateValues: true,
      translateKeys: true,
      reviveValues: true,
      sanitize: true,
      mergeOutput: true,
    })) as RawTags | undefined;
  } catch {
    return { ok: false, error: "This file's metadata could not be read. It may be damaged." };
  }

  if (!tags) {
    return { ok: true, format, hasAnyMetadata: false, hasGps: false, groups: [] };
  }

  const { groups, hasGps } = buildGroups(tags);
  return { ok: true, format, hasAnyMetadata: groups.length > 0, hasGps, groups };
}
