import * as pdfLib from "pdf-lib";
import { describe, expect, it } from "vitest";
import { findUnsupportedStandardFontCharacter, parseHexColor } from "./fonts";
import { displayedSize, displayedToRaw, displayedToRawAngle, normalizeRotation, rotateVector } from "./geometry";
import {
  addPageNumbers,
  computeLabelPosition,
  defaultPageNumberOptions,
  formatNumber,
  formatPageLabel,
  toRoman,
  validatePageNumberOptions,
} from "./page-numbers";
import { parsePageRange } from "./page-range";
import { makePdf, readPdf } from "./test-utils";

describe("parsePageRange", () => {
  it("selects every page for empty input", () => {
    expect(parsePageRange("", 3)).toEqual({ ok: true, pages: [1, 2, 3] });
    expect(parsePageRange("   ", 2)).toEqual({ ok: true, pages: [1, 2] });
  });

  it("parses numbers, ranges and open ranges, sorted and de-duplicated", () => {
    expect(parsePageRange("5, 1-3, 2, 8-", 10)).toEqual({ ok: true, pages: [1, 2, 3, 5, 8, 9, 10] });
    expect(parsePageRange("-3", 10)).toEqual({ ok: true, pages: [1, 2, 3] });
    expect(parsePageRange(" 2 - 4 ", 10)).toEqual({ ok: true, pages: [2, 3, 4] });
  });

  it.each([
    ["0", /start at 1/],
    ["11", /outside this PDF.*10 pages/],
    ["3-1", /runs backwards/],
    ["1,,2", /empty entry/],
    ["a", /not a valid page/],
    ["-", /not a valid page/],
    ["1-99", /outside this PDF/],
  ])("rejects %j", (input, message) => {
    const result = parsePageRange(input, 10);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toMatch(message);
  });

  it("rejects documents with no pages", () => {
    expect(parsePageRange("", 0).ok).toBe(false);
  });
});

describe("geometry", () => {
  const box = { x: 0, y: 0, width: 200, height: 100 };

  it("snaps rotations to multiples of 90", () => {
    expect(normalizeRotation(0)).toBe(0);
    expect(normalizeRotation(-90)).toBe(270);
    expect(normalizeRotation(450)).toBe(90);
    expect(normalizeRotation(89)).toBe(90);
  });

  it("swaps displayed width and height for sideways pages", () => {
    expect(displayedSize(box, 0)).toEqual({ width: 200, height: 100 });
    expect(displayedSize(box, 90)).toEqual({ width: 100, height: 200 });
    expect(displayedSize(box, 180)).toEqual({ width: 200, height: 100 });
    expect(displayedSize(box, 270)).toEqual({ width: 100, height: 200 });
  });

  it("maps the displayed bottom-left corner to the correct raw corner for each rotation", () => {
    // A page rotated clockwise 90° shows its raw bottom-right corner at the bottom-left, and so on.
    expect(displayedToRaw(box, 0, 0, 0)).toEqual({ x: 0, y: 0 });
    expect(displayedToRaw(box, 90, 0, 0)).toEqual({ x: 200, y: 0 });
    expect(displayedToRaw(box, 180, 0, 0)).toEqual({ x: 200, y: 100 });
    expect(displayedToRaw(box, 270, 0, 0)).toEqual({ x: 0, y: 100 });
  });

  it("maps the displayed bottom-right corner consistently", () => {
    expect(displayedToRaw(box, 90, 100, 0)).toEqual({ x: 200, y: 100 });
    expect(displayedToRaw(box, 270, 100, 0)).toEqual({ x: 0, y: 0 });
  });

  it("is a rigid transform: displayed x-axis maps to the raw direction given by the angle", () => {
    for (const rotation of [0, 90, 180, 270] as const) {
      const origin = displayedToRaw(box, rotation, 10, 10);
      const along = displayedToRaw(box, rotation, 11, 10);
      const expected = rotateVector(1, 0, displayedToRawAngle(rotation, 0));
      expect(along.x - origin.x).toBeCloseTo(expected.x, 9);
      expect(along.y - origin.y).toBeCloseTo(expected.y, 9);
      const up = displayedToRaw(box, rotation, 10, 11);
      const expectedUp = rotateVector(0, 1, displayedToRawAngle(rotation, 0));
      expect(up.x - origin.x).toBeCloseTo(expectedUp.x, 9);
      expect(up.y - origin.y).toBeCloseTo(expectedUp.y, 9);
    }
  });

  it("applies the crop box origin", () => {
    expect(displayedToRaw({ x: 10, y: 20, width: 200, height: 100 }, 0, 5, 6)).toEqual({ x: 15, y: 26 });
  });
});

describe("fonts", () => {
  it("accepts Western European text and rejects anything else", () => {
    expect(findUnsupportedStandardFontCharacter("Page 1 of 10 — café €5")).toBeNull();
    expect(findUnsupportedStandardFontCharacter("第1页")).toBe("第");
    expect(findUnsupportedStandardFontCharacter("ok ✓")).toBe("✓");
  });

  it("parses hex colors", () => {
    expect(parseHexColor("#ff0000")).toEqual({ r: 1, g: 0, b: 0 });
    expect(parseHexColor("0f0")).toEqual({ r: 0, g: 1, b: 0 });
    expect(parseHexColor("#12")).toBeNull();
  });
});

describe("page number labels", () => {
  it("converts to Roman numerals", () => {
    expect(toRoman(1)).toBe("I");
    expect(toRoman(4)).toBe("IV");
    expect(toRoman(9)).toBe("IX");
    expect(toRoman(14)).toBe("XIV");
    expect(toRoman(1994)).toBe("MCMXCIV");
    expect(toRoman(3999)).toBe("MMMCMXCIX");
    expect(() => toRoman(0)).toThrow(RangeError);
    expect(() => toRoman(4000)).toThrow(RangeError);
  });

  it("formats numbers and templates", () => {
    expect(formatNumber(7, "arabic")).toBe("7");
    expect(formatNumber(7, "roman-lower")).toBe("vii");
    expect(formatPageLabel("Page {n} of {total}", 3, 12, "arabic")).toBe("Page 3 of 12");
    expect(formatPageLabel("- {n} -", 3, 12, "roman-upper")).toBe("- III -");
  });

  it("computes label positions on the page and keeps them inside it", () => {
    const base = { displayWidth: 600, displayHeight: 800, textWidth: 10, textHeight: 8, margin: 36 };
    expect(computeLabelPosition({ ...base, position: "bottom-center" })).toEqual({ x: 295, y: 36 });
    expect(computeLabelPosition({ ...base, position: "bottom-left" })).toEqual({ x: 36, y: 36 });
    expect(computeLabelPosition({ ...base, position: "bottom-right" })).toEqual({ x: 554, y: 36 });
    expect(computeLabelPosition({ ...base, position: "top-right" })).toEqual({ x: 554, y: 756 });
    expect(computeLabelPosition({ ...base, position: "top-left", displayWidth: 20, displayHeight: 20, margin: 100 })).toEqual({ x: 10, y: 0 });
  });

  it("validates options with specific messages", () => {
    const ok = { ...defaultPageNumberOptions, pages: [1] };
    expect(validatePageNumberOptions(ok)).toBeNull();
    expect(validatePageNumberOptions({ ...ok, format: "Page" })).toMatch(/\{n\}/);
    expect(validatePageNumberOptions({ ...ok, startNumber: 0 })).toMatch(/whole number/);
    expect(validatePageNumberOptions({ ...ok, fontSize: 1 })).toMatch(/Font size/);
    expect(validatePageNumberOptions({ ...ok, color: "red" })).toMatch(/color/);
    expect(validatePageNumberOptions({ ...ok, pages: [] })).toMatch(/at least one page/);
    expect(validatePageNumberOptions({ ...ok, format: "{n} ✓" })).toMatch(/Western European/);
    expect(validatePageNumberOptions({ ...ok, style: "roman-upper", startNumber: 3999, pages: [1, 2] })).toMatch(/3999/);
  });
});

async function helveticaWidth(text: string, size: number) {
  const doc = await pdfLib.PDFDocument.create();
  return (await doc.embedFont(pdfLib.StandardFonts.Helvetica)).widthOfTextAtSize(text, size);
}

describe("addPageNumbers (verified by reading the output PDF with PDF.js)", () => {
  const letter = { width: 612, height: 792 };

  it("numbers every page at the bottom center by default and keeps the original content", async () => {
    const source = await makePdf([letter, letter, letter]);
    const result = await addPageNumbers(pdfLib, source, { ...defaultPageNumberOptions, pages: [1, 2, 3] });
    const pages = await readPdf(result.bytes);

    expect(result.numberedPages).toBe(3);
    expect(pages).toHaveLength(3);

    for (const [index, page] of pages.entries()) {
      expect(page.items.map((item) => item.str)).toContain(`Original page ${index + 1}`);
      const label = page.items.find((item) => item.str === String(index + 1));
      expect(label).toBeDefined();
      const width = await helveticaWidth(String(index + 1), 11);
      expect(label!.transform[4]).toBeCloseTo((612 - width) / 2, 3);
      expect(label!.transform[5]).toBeCloseTo(36, 3);
      expect(label!.transform[0]).toBeCloseTo(11, 3);
    }
  });

  it("numbers only selected pages, consecutively, from a chosen start with a template", async () => {
    const source = await makePdf([letter, letter, letter, letter]);
    const result = await addPageNumbers(pdfLib, source, {
      ...defaultPageNumberOptions,
      format: "Page {n} of {total}",
      startNumber: 5,
      pages: [2, 4],
    });
    const pages = await readPdf(result.bytes);
    const labels = pages.map((page) => page.items.map((item) => item.str).filter((text) => text.startsWith("Page ")));

    expect(labels).toEqual([[], ["Page 5 of 6"], [], ["Page 6 of 6"]]);
    expect(result.firstLabel).toBe("Page 5 of 6");
    expect(result.lastLabel).toBe("Page 6 of 6");
  });

  it("supports Roman numerals", async () => {
    const source = await makePdf([letter, letter]);
    const result = await addPageNumbers(pdfLib, source, { ...defaultPageNumberOptions, style: "roman-lower", pages: [1, 2] });
    const pages = await readPdf(result.bytes);
    expect(pages[0].items.map((item) => item.str)).toContain("i");
    expect(pages[1].items.map((item) => item.str)).toContain("ii");
  });

  it("places labels in each corner position", async () => {
    const source = await makePdf([letter]);
    const width = await helveticaWidth("1", 11);
    const expectations = {
      "bottom-left": [36, 36],
      "bottom-right": [612 - 36 - width, 36],
      "top-left": [36, null],
      "top-right": [612 - 36 - width, null],
    } as const;

    for (const [position, [x, y]] of Object.entries(expectations)) {
      const result = await addPageNumbers(pdfLib, source, {
        ...defaultPageNumberOptions,
        position: position as keyof typeof expectations,
        pages: [1],
      });
      const [page] = await readPdf(result.bytes);
      const label = page.items.find((item) => item.str === "1")!;
      expect(label.transform[4]).toBeCloseTo(x, 3);
      if (y !== null) expect(label.transform[5]).toBeCloseTo(y, 3);
      else expect(label.transform[5]).toBeGreaterThan(792 - 36 - 11);
    }
  });

  it("draws upright on pages rotated for display, mapped to the right corner", async () => {
    const width = await helveticaWidth("1", 11);

    for (const rotation of [90, 180, 270] as const) {
      const source = await makePdf([{ width: 600, height: 400, rotation }]);
      const result = await addPageNumbers(pdfLib, source, { ...defaultPageNumberOptions, pages: [1] });
      const [page] = await readPdf(result.bytes);
      const label = page.items.find((item) => item.str === "1")!;
      const box = { x: 0, y: 0, width: 600, height: 400 };
      const size = displayedSize(box, rotation);
      const expected = displayedToRaw(box, rotation, (size.width - width) / 2, 36);
      const [a, b] = label.transform;

      expect(page.rotate).toBe(rotation);
      expect(label.transform[4]).toBeCloseTo(expected.x, 3);
      expect(label.transform[5]).toBeCloseTo(expected.y, 3);
      // The text matrix direction (a, b) must be the raw-space angle that cancels the page rotation.
      const direction = rotateVector(1, 0, rotation);
      expect(a / 11).toBeCloseTo(direction.x, 6);
      expect(b / 11).toBeCloseTo(direction.y, 6);
    }
  });

  it("respects a crop box that does not start at the origin", async () => {
    const source = await makePdf([{ width: 612, height: 792, cropBox: [50, 60, 400, 500] }]);
    const result = await addPageNumbers(pdfLib, source, { ...defaultPageNumberOptions, pages: [1] });
    const [page] = await readPdf(result.bytes);
    const label = page.items.find((item) => item.str === "1")!;
    const width = await helveticaWidth("1", 11);

    expect(label.transform[4]).toBeCloseTo(50 + (400 - width) / 2, 3);
    expect(label.transform[5]).toBeCloseTo(60 + 36, 3);
  });

  it("handles mixed page sizes", async () => {
    const source = await makePdf([letter, { width: 300, height: 200 }]);
    const result = await addPageNumbers(pdfLib, source, { ...defaultPageNumberOptions, pages: [1, 2] });
    const pages = await readPdf(result.bytes);
    const width = await helveticaWidth("2", 11);
    expect(pages[1].items.find((item) => item.str === "2")!.transform[4]).toBeCloseTo((300 - width) / 2, 3);
  });

  it("does not change the page count, sizes or the original text", async () => {
    const source = await makePdf([letter, { width: 300, height: 200, text: "Second page text" }]);
    const result = await addPageNumbers(pdfLib, source, { ...defaultPageNumberOptions, pages: [1, 2] });
    const reloaded = await pdfLib.PDFDocument.load(result.bytes);
    expect(reloaded.getPageCount()).toBe(2);
    expect(reloaded.getPage(1).getSize()).toEqual({ width: 300, height: 200 });
    const pages = await readPdf(result.bytes);
    expect(pages[1].items.map((item) => item.str)).toContain("Second page text");
  });

  it("rejects invalid options and out-of-range pages without producing output", async () => {
    const source = await makePdf([letter]);
    await expect(addPageNumbers(pdfLib, source, { ...defaultPageNumberOptions, format: "x", pages: [1] })).rejects.toThrow(/\{n\}/);
    await expect(addPageNumbers(pdfLib, source, { ...defaultPageNumberOptions, pages: [2] })).rejects.toThrow(/Page 2 does not exist/);
  });

  it("rejects encrypted input instead of silently ignoring the encryption", async () => {
    await expect(addPageNumbers(pdfLib, new Uint8Array([1, 2, 3]), { ...defaultPageNumberOptions, pages: [1] })).rejects.toBeTruthy();
  });
});
