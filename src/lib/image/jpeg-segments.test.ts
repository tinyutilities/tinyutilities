import { describe, expect, it } from "vitest";
import exifr from "exifr";
import { readJpegPixelDimensions, stripJpegMetadata } from "./jpeg-segments";
import { makeJpegFixture } from "./test-utils";

describe("stripJpegMetadata", () => {
  it("removes the EXIF (APP1) segment and reports it", () => {
    const source = makeJpegFixture({ make: "Acme", model: "Camera 1" });
    const { bytes, removedMarkers } = stripJpegMetadata(source);
    expect(removedMarkers).toEqual([0xe1]);
    expect(bytes.length).toBeLessThan(source.length);
    const text = Array.from(bytes).map((b) => String.fromCharCode(b)).join("");
    expect(text).not.toContain("Exif");
    expect(text).not.toContain("Acme");
  });

  it("removes a Photoshop/IPTC (APP13) segment and a comment (COM)", () => {
    const source = makeJpegFixture({ photoshop: true, comment: "edited in testsuite" });
    const { removedMarkers } = stripJpegMetadata(source);
    expect(removedMarkers.sort()).toEqual([0xed, 0xfe]);
  });

  it("keeps APP0 (JFIF) and all image-data markers byte-for-byte", () => {
    const source = makeJpegFixture({ make: "Acme" });
    const { bytes } = stripJpegMetadata(source);

    // DQT(0xDB)/SOF0(0xC0)/DHT(0xC4)/SOS(0xDA)/scan-data/EOI survive unchanged, so the stripped
    // file's tail must exactly match the source's tail from the first DQT marker onward.
    const findMarker = (data: Uint8Array, marker: number) => {
      for (let i = 0; i < data.length - 1; i += 1) if (data[i] === 0xff && data[i + 1] === marker) return i;
      return -1;
    };
    const sourceDqt = findMarker(source, 0xdb);
    const strippedDqt = findMarker(bytes, 0xdb);
    expect(Array.from(bytes.slice(strippedDqt))).toEqual(Array.from(source.slice(sourceDqt)));
  });

  it("produces output exifr can no longer find EXIF in", async () => {
    const source = makeJpegFixture({ make: "Acme", model: "Camera 1", orientation: 6 });
    const before = await exifr.parse(source, { tiff: true, mergeOutput: true });
    expect(before?.Make).toBe("Acme");

    const { bytes } = stripJpegMetadata(source);
    const after = await exifr.parse(Buffer.from(bytes), { tiff: true, mergeOutput: true });
    expect(after).toBeUndefined();
  });

  it("is lossless when there is nothing to strip", () => {
    const source = makeJpegFixture();
    const { bytes, removedMarkers } = stripJpegMetadata(source);
    expect(removedMarkers).toEqual([]);
    expect(Array.from(bytes)).toEqual(Array.from(source));
  });

  it("handles a JPEG with no EOI gracefully by copying what exists", () => {
    const source = makeJpegFixture({ make: "Acme" });
    const withoutEoi = source.slice(0, source.length - 2);
    expect(() => stripJpegMetadata(withoutEoi)).not.toThrow();
  });

  it("rejects a file that is not a JPEG", () => {
    expect(() => stripJpegMetadata(new Uint8Array([1, 2, 3, 4]))).toThrow(/SOI/);
  });

  it("rejects a JPEG with a truncated segment", () => {
    const source = makeJpegFixture({ make: "Acme" });
    expect(() => stripJpegMetadata(source.slice(0, 10))).toThrow();
  });
});

describe("readJpegPixelDimensions", () => {
  it("reads the real raw dimensions from the SOF0 marker, matching the fixture's own 8x8", () => {
    expect(readJpegPixelDimensions(makeJpegFixture())).toEqual({ width: 8, height: 8 });
  });

  it("is unaffected by EXIF metadata, including an orientation tag", () => {
    const withExif = makeJpegFixture({ make: "Acme", orientation: 6, gps: { latitude: 1, longitude: 2 } });
    expect(readJpegPixelDimensions(withExif)).toEqual({ width: 8, height: 8 });
  });

  it("still finds the SOF after other segments are removed", () => {
    const source = makeJpegFixture({ make: "Acme", comment: "hi" });
    const { bytes } = stripJpegMetadata(source);
    expect(readJpegPixelDimensions(bytes)).toEqual({ width: 8, height: 8 });
  });

  it("returns null for non-JPEG or malformed input", () => {
    expect(readJpegPixelDimensions(new Uint8Array([1, 2, 3, 4]))).toBeNull();
    expect(readJpegPixelDimensions(makeJpegFixture().slice(0, 10))).toBeNull();
  });
});
