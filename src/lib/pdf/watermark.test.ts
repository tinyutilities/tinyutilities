import * as pdfLib from "pdf-lib";
import { describe, expect, it } from "vitest";
import { displayedSize, displayedToRaw, rotateVector } from "./geometry";
import { makePdf, makePng, readPdf } from "./test-utils";
import {
  addWatermark,
  computePlacements,
  detectImageFormat,
  maxTilesPerPage,
  validateWatermarkOptions,
  type ImageWatermarkOptions,
  type TextWatermarkOptions,
} from "./watermark";

const textOptions: TextWatermarkOptions = {
  kind: "text",
  text: "CONFIDENTIAL",
  fontSize: 48,
  color: "#ff0000",
  opacity: 0.3,
  rotation: 45,
  layout: "center",
  pages: [1],
};

const png = makePng(40, 20, [200, 30, 30]);
const imageOptions: ImageWatermarkOptions = {
  kind: "image",
  bytes: png,
  widthPercent: 30,
  opacity: 0.4,
  rotation: 0,
  layout: "center",
  pages: [1],
};

async function boldMetrics(text: string, size: number) {
  const doc = await pdfLib.PDFDocument.create();
  const font = await doc.embedFont(pdfLib.StandardFonts.HelveticaBold);
  return { width: font.widthOfTextAtSize(text, size), height: font.heightAtSize(size, { descender: false }) };
}

/** Opacity values (the `ca` entry) of every graphics state on page `index` of a PDF. */
async function pageOpacities(bytes: Uint8Array, index: number) {
  const doc = await pdfLib.PDFDocument.load(bytes);
  const resources = doc.getPage(index).node.Resources();
  const states = resources?.lookupMaybe(pdfLib.PDFName.of("ExtGState"), pdfLib.PDFDict);
  if (!states) return [];
  return states.keys().map((key) => states.lookup(key, pdfLib.PDFDict).lookup(pdfLib.PDFName.of("ca"), pdfLib.PDFNumber).asNumber());
}

describe("computePlacements", () => {
  const base = { displayWidth: 600, displayHeight: 800, itemWidth: 200, itemHeight: 50, rotation: 0 };

  it("centers a single item by its middle, not its corner", () => {
    const result = computePlacements({ ...base, layout: "center" });
    expect(result).toEqual({ ok: true, placements: [{ anchorX: 200, anchorY: 375 }] });
  });

  it("keeps the center fixed when the item is rotated", () => {
    const result = computePlacements({ ...base, rotation: 90, layout: "center" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { anchorX, anchorY } = result.placements[0];
    const centre = rotateVector(100, 25, 90);
    expect(anchorX + centre.x).toBeCloseTo(300, 9);
    expect(anchorY + centre.y).toBeCloseTo(400, 9);
  });

  it("tiles across the whole page and every copy overlaps the page", () => {
    const result = computePlacements({ ...base, rotation: 30, layout: "tile" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.placements.length).toBeGreaterThan(4);
    expect(result.placements.length).toBeLessThanOrEqual(maxTilesPerPage);

    const centres = result.placements.map((placement) => {
      const offset = rotateVector(100, 25, 30);
      return { x: placement.anchorX + offset.x, y: placement.anchorY + offset.y };
    });
    const xs = centres.map((centre) => centre.x);
    const ys = centres.map((centre) => centre.y);
    // Copies reach every part of the page, leaving only the gaps between rows.
    expect(Math.min(...xs)).toBeLessThan(120);
    expect(Math.max(...xs)).toBeGreaterThan(480);
    expect(Math.min(...ys)).toBeLessThan(200);
    expect(Math.max(...ys)).toBeGreaterThan(600);
  });

  it("refuses to create an unreasonable number of tiles", () => {
    const result = computePlacements({ ...base, itemWidth: 6, itemHeight: 3, layout: "tile" });
    expect(result.ok).toBe(false);
  });
});

describe("validateWatermarkOptions", () => {
  it("accepts valid options", () => {
    expect(validateWatermarkOptions(textOptions)).toBeNull();
    expect(validateWatermarkOptions(imageOptions)).toBeNull();
  });

  it.each([
    [{ ...textOptions, text: "  " }, /Enter the watermark text/],
    [{ ...textOptions, text: "a\nb" }, /single line/],
    [{ ...textOptions, text: "x".repeat(101) }, /100 characters/],
    [{ ...textOptions, text: "机密" }, /Western European/],
    [{ ...textOptions, fontSize: 2 }, /Font size/],
    [{ ...textOptions, color: "blue" }, /color/],
    [{ ...textOptions, opacity: 0 }, /Opacity/],
    [{ ...textOptions, rotation: 200 }, /Rotation/],
    [{ ...textOptions, pages: [] }, /at least one page/],
    [{ ...imageOptions, bytes: new Uint8Array([1, 2, 3, 4]) }, /PNG or JPEG/],
    [{ ...imageOptions, widthPercent: 1 }, /Image width/],
  ])("rejects %#", (options, message) => {
    expect(validateWatermarkOptions(options)).toMatch(message);
  });

  it("detects image formats from their signatures", () => {
    expect(detectImageFormat(png)).toBe("png");
    expect(detectImageFormat(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("jpeg");
    expect(detectImageFormat(new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0, 0, 0]))).toBeNull();
  });
});

describe("addWatermark with text (verified by reading the output PDF)", () => {
  it("centers the text on the page at the requested angle, and keeps the original content", async () => {
    const source = await makePdf([{ width: 612, height: 792 }, { width: 612, height: 792 }]);
    const result = await addWatermark(pdfLib, source, textOptions);
    const pages = await readPdf(result.bytes);

    expect(result.watermarkedPages).toBe(1);
    expect(result.copiesPerPage).toBe(1);
    expect(pages[0].items.map((item) => item.str)).toContain("Original page 1");
    expect(pages[1].items.map((item) => item.str)).toEqual(["Original page 2"]);

    const mark = pages[0].items.find((item) => item.str === "CONFIDENTIAL")!;
    const [a, b, , , e, f] = mark.transform;
    const { width, height } = await boldMetrics("CONFIDENTIAL", 48);
    const centre = rotateVector(width / 2, height / 2, 45);

    expect(Math.hypot(a, b)).toBeCloseTo(48, 3);
    expect(Math.atan2(b, a) * (180 / Math.PI)).toBeCloseTo(45, 3);
    expect(e + centre.x).toBeCloseTo(306, 3);
    expect(f + centre.y).toBeCloseTo(396, 3);
  });

  it("applies the requested opacity only on watermarked pages", async () => {
    const source = await makePdf([{ width: 612, height: 792 }, { width: 612, height: 792 }]);
    const result = await addWatermark(pdfLib, source, { ...textOptions, opacity: 0.25 });
    expect(await pageOpacities(result.bytes, 0)).toEqual([0.25]);
    expect(await pageOpacities(result.bytes, 1)).toEqual([]);
  });

  it("stays centered on pages with a display rotation and a crop box", async () => {
    for (const rotation of [90, 180, 270] as const) {
      const source = await makePdf([{ width: 600, height: 400, rotation, cropBox: [20, 30, 500, 300] }]);
      const result = await addWatermark(pdfLib, source, { ...textOptions, rotation: 30 });
      const [page] = await readPdf(result.bytes);
      const mark = page.items.find((item) => item.str === "CONFIDENTIAL")!;
      const [a, b, , , e, f] = mark.transform;
      const box = { x: 20, y: 30, width: 500, height: 300 };
      const { width, height } = await boldMetrics("CONFIDENTIAL", 48);
      const size = displayedSize(box, rotation);
      const expectedCentre = displayedToRaw(box, rotation, size.width / 2, size.height / 2);
      const centre = rotateVector(width / 2, height / 2, (Math.atan2(b, a) * 180) / Math.PI);

      expect(Math.atan2(b, a) * (180 / Math.PI)).toBeCloseTo(30 + rotation > 180 ? 30 + rotation - 360 : 30 + rotation, 3);
      expect(e + centre.x).toBeCloseTo(expectedCentre.x, 3);
      expect(f + centre.y).toBeCloseTo(expectedCentre.y, 3);
    }
  });

  it("repeats the text across the page in tile mode", async () => {
    const source = await makePdf([{ width: 612, height: 792 }]);
    const result = await addWatermark(pdfLib, source, { ...textOptions, text: "DRAFT", fontSize: 36, layout: "tile" });
    const [page] = await readPdf(result.bytes);
    // PDF.js splits a copy that is cut by the page edge into fragments ("DRAF" + "RAFT"), so count every
    // non-empty text run other than the original page text rather than exact "DRAFT" matches.
    const copies = page.items.filter((item) => item.str.trim() !== "" && item.str !== "Original page 1");

    expect(copies.length).toBe(result.copiesPerPage);
    expect(copies.length).toBeGreaterThan(4);
  });

  it("marks only the selected pages", async () => {
    const source = await makePdf([{ width: 300, height: 300 }, { width: 300, height: 300 }, { width: 300, height: 300 }]);
    const result = await addWatermark(pdfLib, source, { ...textOptions, fontSize: 20, pages: [1, 3] });
    const pages = await readPdf(result.bytes);
    expect(pages.map((page) => page.items.some((item) => item.str === "CONFIDENTIAL"))).toEqual([true, false, true]);
  });

  it("rejects out-of-range pages and invalid options", async () => {
    const source = await makePdf([{ width: 300, height: 300 }]);
    await expect(addWatermark(pdfLib, source, { ...textOptions, pages: [2] })).rejects.toThrow(/Page 2 does not exist/);
    await expect(addWatermark(pdfLib, source, { ...textOptions, text: "" })).rejects.toThrow(/Enter the watermark text/);
  });
});

describe("addWatermark with an image", () => {
  it("draws the image once per placement and sets its opacity", async () => {
    const source = await makePdf([{ width: 612, height: 792 }, { width: 612, height: 792 }]);
    const result = await addWatermark(pdfLib, source, imageOptions);
    const pages = await readPdf(result.bytes);

    expect(pages[0].imageCount).toBe(1);
    expect(pages[1].imageCount).toBe(0);
    expect(await pageOpacities(result.bytes, 0)).toEqual([0.4]);
  });

  it("tiles images and keeps text intact", async () => {
    const source = await makePdf([{ width: 612, height: 792 }]);
    const result = await addWatermark(pdfLib, source, { ...imageOptions, widthPercent: 20, layout: "tile", rotation: 20 });
    const [page] = await readPdf(result.bytes);

    expect(page.imageCount).toBe(result.copiesPerPage);
    expect(page.imageCount).toBeGreaterThan(4);
    expect(page.items.map((item) => item.str)).toContain("Original page 1");
  });
});
