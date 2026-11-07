import { describe, expect, it } from "vitest";
import exifr from "exifr";
import { stripPngMetadata } from "./png-chunks";
import { buildExifTiff, makePngFixture } from "./test-utils";

describe("stripPngMetadata", () => {
  it("removes tEXt, eXIf and tIME chunks", () => {
    const source = makePngFixture({
      text: [["Author", "Jane Doe"], ["Software", "TestSuite"]],
      exifTiff: buildExifTiff({ make: "Acme" }),
      time: [2026, 1, 15, 10, 30, 0],
    });
    const { removedChunkTypes } = stripPngMetadata(source);
    expect(removedChunkTypes.sort()).toEqual(["eXIf", "tEXt", "tEXt", "tIME"].sort());
  });

  it("keeps IHDR, IDAT and IEND, and the result decodes to the same pixels", () => {
    const source = makePngFixture({ rgb: [10, 20, 30], text: [["Author", "Jane"]] });
    const { bytes } = stripPngMetadata(source);

    const types = (data: Uint8Array) => {
      const found: string[] = [];
      let offset = 8;
      while (offset < data.length) {
        const length = (data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3];
        found.push(String.fromCharCode(data[offset + 4], data[offset + 5], data[offset + 6], data[offset + 7]));
        offset += 12 + length;
      }
      return found;
    };

    expect(types(bytes)).toEqual(["IHDR", "IDAT", "IEND"]);
  });

  it("produces output exifr can no longer find metadata in", async () => {
    const source = makePngFixture({ exifTiff: buildExifTiff({ make: "Acme", model: "X1" }) });
    const before = await exifr.parse(Buffer.from(source), { tiff: true, mergeOutput: true });
    expect(before?.Make).toBe("Acme");

    const { bytes } = stripPngMetadata(source);
    const after = await exifr.parse(Buffer.from(bytes), { tiff: true, mergeOutput: true });
    expect(after?.Make).toBeUndefined();
  });

  it("is lossless when there is nothing to strip", () => {
    const source = makePngFixture();
    const { bytes, removedChunkTypes } = stripPngMetadata(source);
    expect(removedChunkTypes).toEqual([]);
    expect(Array.from(bytes)).toEqual(Array.from(source));
  });

  it("rejects a file that is not a PNG", () => {
    expect(() => stripPngMetadata(new Uint8Array([1, 2, 3, 4]))).toThrow(/signature/);
  });

  it("rejects a PNG with a truncated chunk", () => {
    const source = makePngFixture({ text: [["Author", "Jane"]] });
    expect(() => stripPngMetadata(source.slice(0, 20))).toThrow();
  });
});
