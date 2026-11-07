import * as fflate from "fflate";
import { describe, expect, it } from "vitest";
import {
  computeRenderSize,
  imageFilename,
  imageFormats,
  maxRenderPixels,
  maxRenderSide,
  zipImages,
} from "./render-plan";

describe("computeRenderSize", () => {
  it("converts PDF points to pixels at the chosen DPI", () => {
    // US Letter is 612 × 792 pt (8.5 × 11 in).
    expect(computeRenderSize(612, 792, 72)).toMatchObject({ width: 612, height: 792, scale: 1, clamped: false });
    expect(computeRenderSize(612, 792, 150)).toMatchObject({ width: 1275, height: 1650, clamped: false });
    expect(computeRenderSize(612, 792, 300)).toMatchObject({ width: 2550, height: 3300, clamped: false });
  });

  it("reduces oversized pages to the side limit, keeping the aspect ratio, and says so", () => {
    const size = computeRenderSize(14400, 7200, 300); // 200 × 100 inch poster
    expect(size.clamped).toBe(true);
    expect(Math.max(size.width, size.height)).toBeLessThanOrEqual(maxRenderSide);
    expect(size.width / size.height).toBeCloseTo(2, 2);
  });

  it("reduces pages that would exceed the pixel budget", () => {
    const size = computeRenderSize(5000, 5000, 300);
    expect(size.clamped).toBe(true);
    expect(size.width * size.height).toBeLessThanOrEqual(maxRenderPixels);
  });

  it("never returns a zero-sized image", () => {
    expect(computeRenderSize(0.1, 0.1, 72)).toMatchObject({ width: 1, height: 1 });
  });
});

describe("imageFilename", () => {
  it("zero-pads page numbers so files sort in order", () => {
    expect(imageFilename("report", 7, 12, "png")).toBe("report-page-07.png");
    expect(imageFilename("report", 7, 1200, "jpg")).toBe("report-page-0007.jpg");
    expect(imageFilename("a", 1, 1, "webp")).toBe("a-page-01.webp");
  });

  it("produces names that sort lexically in page order", () => {
    const names = [1, 2, 10, 11, 100].map((page) => imageFilename("x", page, 100, "png"));
    expect([...names].sort()).toEqual(names);
  });
});

describe("imageFormats", () => {
  it("maps formats to MIME types and extensions", () => {
    expect(imageFormats.map((format) => [format.value, format.mimeType, format.extension])).toEqual([
      ["png", "image/png", "png"],
      ["jpeg", "image/jpeg", "jpg"],
      ["webp", "image/webp", "webp"],
    ]);
  });
});

describe("zipImages", () => {
  it("stores files unchanged and round-trips through unzip", () => {
    const entries = [
      { name: "a-page-01.png", data: new Uint8Array([1, 2, 3, 4]) },
      { name: "a-page-02.png", data: new Uint8Array([9, 8, 7]) },
    ];
    const zipped = zipImages(fflate, entries);
    const unzipped = fflate.unzipSync(zipped);

    expect(Object.keys(unzipped)).toEqual(["a-page-01.png", "a-page-02.png"]);
    expect(Array.from(unzipped["a-page-01.png"])).toEqual([1, 2, 3, 4]);
    expect(Array.from(unzipped["a-page-02.png"])).toEqual([9, 8, 7]);
  });

  it("refuses duplicate names instead of overwriting a page", () => {
    const entry = { name: "same.png", data: new Uint8Array([1]) };
    expect(() => zipImages(fflate, [entry, entry])).toThrow(/Duplicate/);
  });
});
