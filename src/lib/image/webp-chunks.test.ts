import { describe, expect, it } from "vitest";
import exifr from "exifr";
import { findWebpChunk, stripWebpMetadata } from "./webp-chunks";
import { buildExifTiff, makeWebpFixture } from "./test-utils";

function chunkIds(data: Uint8Array): string[] {
  const ids: string[] = [];
  let offset = 12;
  while (offset < data.length) {
    ids.push(String.fromCharCode(data[offset], data[offset + 1], data[offset + 2], data[offset + 3]));
    const size = data[offset + 4] | (data[offset + 5] << 8) | (data[offset + 6] << 16) | (data[offset + 7] << 24);
    offset += 8 + size + (size % 2);
  }
  return ids;
}

describe("stripWebpMetadata", () => {
  it("removes EXIF and XMP chunks and keeps the image chunk", () => {
    const source = makeWebpFixture({ exifTiff: buildExifTiff({ make: "Acme" }), xmp: "<x:xmpmeta/>" });
    const { bytes, removedChunkIds } = stripWebpMetadata(source);
    expect(removedChunkIds.sort()).toEqual(["EXIF", "XMP "]);
    expect(chunkIds(bytes)).toEqual(["VP8 "]);
  });

  it("recomputes the outer RIFF size after removing chunks", () => {
    const source = makeWebpFixture({ exifTiff: buildExifTiff({ make: "Acme" }) });
    const { bytes } = stripWebpMetadata(source);
    const declaredSize = bytes[4] | (bytes[5] << 8) | (bytes[6] << 16) | (bytes[7] << 24);
    expect(declaredSize).toBe(bytes.length - 8);
  });

  it("produces output with no EXIF chunk left (exifr has no native WebP support, so the chunk itself is the check)", async () => {
    const source = makeWebpFixture({ exifTiff: buildExifTiff({ make: "Acme", model: "X1" }) });
    const beforeChunk = findWebpChunk(source, "EXIF");
    expect(beforeChunk).not.toBeNull();
    const before = await exifr.parse(Buffer.from(beforeChunk!), { tiff: true, mergeOutput: true });
    expect(before?.Make).toBe("Acme");

    const { bytes } = stripWebpMetadata(source);
    expect(findWebpChunk(bytes, "EXIF")).toBeNull();
  });

  it("is lossless when there is nothing to strip", () => {
    const source = makeWebpFixture();
    const { bytes, removedChunkIds } = stripWebpMetadata(source);
    expect(removedChunkIds).toEqual([]);
    expect(Array.from(bytes)).toEqual(Array.from(source));
  });

  it("rejects a file that is not a WebP", () => {
    expect(() => stripWebpMetadata(new Uint8Array([1, 2, 3, 4]))).toThrow(/RIFF/);
  });

  it("handles an odd-length chunk's padding byte correctly", () => {
    // The XMP chunk's content here is an odd number of bytes, so a padding byte must follow it —
    // confirms the chunk walker advances past the pad rather than misreading the next header.
    const source = makeWebpFixture({ xmp: "odd" });
    const { bytes } = stripWebpMetadata(source);
    expect(chunkIds(bytes)).toEqual(["VP8 "]);
  });
});
