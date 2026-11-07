import { describe, expect, it } from "vitest";
import realExifr from "exifr";
import { readImageMetadata, readRawOrientation } from "./metadata";
import { buildExifTiff, makeJpegFixture, makePngFixture, makeWebpFixture } from "./test-utils";

/** A stand-in for the `exifr` module whose `.parse()` returns a fixed set of tags regardless of
 *  input, so the field-mapping/grouping/sensitivity logic can be tested directly and
 *  exhaustively without needing a real binary fixture for every case. */
function fakeExifr(tags: Record<string, unknown> | undefined) {
  return { parse: async () => tags } as unknown as typeof import("exifr");
}

const jpegBytes = makeJpegFixture();

describe("readImageMetadata — field mapping (via a stand-in exifr)", () => {
  it("reports no metadata when exifr finds nothing", async () => {
    const result = await readImageMetadata(fakeExifr(undefined), jpegBytes);
    expect(result).toEqual({ ok: true, format: "jpeg", hasAnyMetadata: false, hasGps: false, groups: [] });
  });

  it("groups camera, date and image fields in plain language", async () => {
    const result = await readImageMetadata(
      fakeExifr({
        Make: "Acme ",
        Model: "Camera 1",
        LensModel: "50mm f/1.8",
        FNumber: 1.8,
        ExposureTime: 1 / 200,
        ISO: 400,
        FocalLength: 50,
        DateTimeOriginal: new Date("2026-01-15T10:30:00Z"),
        Orientation: "Rotate 90 CW",
      }),
      jpegBytes,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.hasAnyMetadata).toBe(true);
    expect(result.hasGps).toBe(false);

    const camera = result.groups.find((group) => group.title === "Camera")!;
    expect(camera.fields).toEqual([
      { label: "Camera make", value: "Acme" },
      { label: "Camera model", value: "Camera 1" },
      { label: "Lens", value: "50mm f/1.8" },
      { label: "Aperture", value: "f/1.8" },
      { label: "Shutter speed", value: "1/200s" },
      { label: "ISO", value: "400" },
      { label: "Focal length", value: "50mm" },
    ]);

    const date = result.groups.find((group) => group.title === "Date")!;
    expect(date.fields).toEqual([{ label: "Date taken", value: "2026-01-15 10:30:00 UTC" }]);

    const image = result.groups.find((group) => group.title === "Image")!;
    expect(image.fields).toEqual([{ label: "Orientation", value: "Rotate 90 CW" }]);
  });

  it("flags GPS coordinates as sensitive and formats them readably", async () => {
    const result = await readImageMetadata(fakeExifr({ latitude: 40.7484, longitude: -73.9857 }), jpegBytes);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.hasGps).toBe(true);

    const location = result.groups.find((group) => group.title.startsWith("Location"))!;
    expect(location.fields).toEqual([
      { label: "Latitude", value: "40.748400° N", sensitive: true },
      { label: "Longitude", value: "73.985700° W", sensitive: true },
    ]);
  });

  it("marks software, artist and copyright as sensitive/authorship fields", async () => {
    const result = await readImageMetadata(fakeExifr({ Software: "Editor 2.0", Artist: "Jane Doe", Copyright: "(c) Jane" }), jpegBytes);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const image = result.groups.find((group) => group.title === "Image")!;
    expect(image.fields).toContainEqual({ label: "Software", value: "Editor 2.0", sensitive: true });
    expect(image.fields).toContainEqual({ label: "Artist", value: "Jane Doe", sensitive: true });
    expect(image.fields).toContainEqual({ label: "Copyright", value: "(c) Jane" });
  });

  it("silently ignores fields it doesn't curate, rather than dumping them", async () => {
    const result = await readImageMetadata(fakeExifr({ MakerNoteUnknownBlob: "\x00\x01\x02garbage", ColorSpace: 1 }), jpegBytes);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.hasAnyMetadata).toBe(false);
    expect(JSON.stringify(result.groups)).not.toContain("MakerNoteUnknownBlob");
  });

  it("returns a clear error when exifr throws (a damaged file)", async () => {
    const throwing = { parse: async () => { throw new Error("bad"); } } as unknown as typeof import("exifr");
    const result = await readImageMetadata(throwing, jpegBytes);
    expect(result).toEqual({ ok: false, error: "This file's metadata could not be read. It may be damaged." });
  });

  it("rejects a file that isn't JPEG/PNG/WebP before ever calling exifr", async () => {
    const result = await readImageMetadata(fakeExifr({ Make: "should not be reached" }), new Uint8Array([1, 2, 3]));
    expect(result).toEqual({ ok: false, error: "This doesn't look like a JPEG, PNG, or WebP file." });
  });
});

describe("readImageMetadata — real exifr against real fixtures", () => {
  it("reads Make/Model/Orientation from a real JPEG EXIF segment", async () => {
    const bytes = makeJpegFixture({ make: "Acme", model: "Camera 1", orientation: 6 });
    const result = await readImageMetadata(realExifr, bytes);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.format).toBe("jpeg");
    const camera = result.groups.find((group) => group.title === "Camera")!;
    expect(camera.fields.find((field) => field.label === "Camera make")?.value).toBe("Acme");
  });

  it("reads GPS coordinates from a real JPEG and flags them", async () => {
    const bytes = makeJpegFixture({ gps: { latitude: 48.8584, longitude: 2.2945 } });
    const result = await readImageMetadata(realExifr, bytes);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.hasGps).toBe(true);
  });

  it("reads EXIF embedded in a real PNG eXIf chunk", async () => {
    const bytes = makePngFixture({ exifTiff: buildExifTiff({ make: "Acme", model: "PngCam" }) });
    const result = await readImageMetadata(realExifr, bytes);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.format).toBe("png");
    expect(result.hasAnyMetadata).toBe(true);
  });

  it("reads EXIF embedded in a real WebP EXIF chunk", async () => {
    const bytes = makeWebpFixture({ exifTiff: buildExifTiff({ make: "Acme", model: "WebpCam" }) });
    const result = await readImageMetadata(realExifr, bytes);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.format).toBe("webp");
    expect(result.hasAnyMetadata).toBe(true);
  });

  it("reads the raw numeric Orientation tag, untranslated", async () => {
    expect(await readRawOrientation(realExifr, makeJpegFixture({ orientation: 6 }))).toBe(6);
    expect(await readRawOrientation(realExifr, makeJpegFixture())).toBeUndefined();
  });

  it("reports no metadata for a clean fixture with none embedded", async () => {
    const result = await readImageMetadata(realExifr, makeJpegFixture());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.hasAnyMetadata).toBe(false);
  });
});
