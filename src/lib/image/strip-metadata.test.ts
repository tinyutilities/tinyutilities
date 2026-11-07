import { describe, expect, it } from "vitest";
import exifr from "exifr";
import { needsOrientationBakeIn, stripImageMetadata } from "./strip-metadata";
import { findWebpChunk } from "./webp-chunks";
import { buildExifTiff, makeJpegFixture, makePngFixture, makeWebpFixture } from "./test-utils";

describe("stripImageMetadata", () => {
  it("strips JPEG, PNG and WebP and names what was removed, in plain language", () => {
    const jpeg = stripImageMetadata(makeJpegFixture({ make: "Acme", comment: "hi" }));
    expect(jpeg.format).toBe("jpeg");
    expect(jpeg.removed.sort()).toEqual(["EXIF/XMP data", "comment"].sort());

    const png = stripImageMetadata(makePngFixture({ text: [["Author", "Jane"]] }));
    expect(png.format).toBe("png");
    expect(png.removed).toEqual(["text metadata"]);

    const webp = stripImageMetadata(makeWebpFixture({ exifTiff: buildExifTiff({ make: "Acme" }) }));
    expect(webp.format).toBe("webp");
    expect(webp.removed).toEqual(["EXIF data"]);
  });

  it("reports an empty removed list, not an error, when there was nothing to remove", () => {
    expect(stripImageMetadata(makeJpegFixture()).removed).toEqual([]);
    expect(stripImageMetadata(makePngFixture()).removed).toEqual([]);
    expect(stripImageMetadata(makeWebpFixture()).removed).toEqual([]);
  });

  it("verifies against the real reader: stripped JPEG/PNG have no EXIF left", async () => {
    const fixtures = [
      makeJpegFixture({ make: "Acme", gps: { latitude: 1, longitude: 2 } }),
      makePngFixture({ exifTiff: buildExifTiff({ make: "Acme" }) }),
    ];

    for (const source of fixtures) {
      const { bytes } = stripImageMetadata(source);
      const tags = await exifr.parse(Buffer.from(bytes), { tiff: true, gps: true, mergeOutput: true });
      expect(tags?.Make, `format bytes: ${bytes[0]},${bytes[1]}`).toBeUndefined();
      expect(tags?.latitude).toBeUndefined();
    }
  });

  it("verifies stripped WebP has no EXIF chunk left (exifr has no native WebP support)", () => {
    const source = makeWebpFixture({ exifTiff: buildExifTiff({ make: "Acme" }) });
    expect(findWebpChunk(source, "EXIF")).not.toBeNull();
    const { bytes } = stripImageMetadata(source);
    expect(findWebpChunk(bytes, "EXIF")).toBeNull();
  });

  it("rejects an unsupported format with a clear message", () => {
    expect(() => stripImageMetadata(new Uint8Array([1, 2, 3, 4]))).toThrow(/JPEG, PNG, or WebP/);
  });
});

describe("needsOrientationBakeIn", () => {
  it("is true only for a JPEG with a non-default EXIF orientation", () => {
    expect(needsOrientationBakeIn("jpeg", 6)).toBe(true);
    expect(needsOrientationBakeIn("jpeg", 3)).toBe(true);
    expect(needsOrientationBakeIn("jpeg", 1)).toBe(false);
    expect(needsOrientationBakeIn("jpeg", undefined)).toBe(false);
  });

  it("is always false for PNG and WebP, since browsers don't apply EXIF orientation to them", () => {
    expect(needsOrientationBakeIn("png", 6)).toBe(false);
    expect(needsOrientationBakeIn("webp", 6)).toBe(false);
  });
});
