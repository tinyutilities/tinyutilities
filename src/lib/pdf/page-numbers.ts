import { displayedSize, displayedToRaw, displayedToRawAngle, normalizeRotation } from "./geometry";
import { findUnsupportedStandardFontCharacter, parseHexColor } from "./fonts";

type PdfLib = typeof import("pdf-lib");

export type NumberPosition =
  | "bottom-center"
  | "bottom-left"
  | "bottom-right"
  | "top-center"
  | "top-left"
  | "top-right";

export type NumberStyle = "arabic" | "roman-lower" | "roman-upper";

export const numberPositions: Array<{ value: NumberPosition; label: string }> = [
  { value: "bottom-center", label: "Bottom center" },
  { value: "bottom-right", label: "Bottom right" },
  { value: "bottom-left", label: "Bottom left" },
  { value: "top-center", label: "Top center" },
  { value: "top-right", label: "Top right" },
  { value: "top-left", label: "Top left" },
];

export const numberStyles: Array<{ value: NumberStyle; label: string }> = [
  { value: "arabic", label: "1, 2, 3" },
  { value: "roman-lower", label: "i, ii, iii" },
  { value: "roman-upper", label: "I, II, III" },
];

export type PageNumberOptions = {
  /** Label template. `{n}` is the page's number and `{total}` is the last number used. */
  format: string;
  style: NumberStyle;
  position: NumberPosition;
  /** Distance from the page edge, in PDF points (1/72 inch). */
  margin: number;
  fontSize: number;
  /** "#rrggbb" */
  color: string;
  /** The number shown on the first numbered page. */
  startNumber: number;
  /** 1-based pages to number, in order. Numbers run consecutively across these pages. */
  pages: number[];
};

export const defaultPageNumberOptions: Omit<PageNumberOptions, "pages"> = {
  format: "{n}",
  style: "arabic",
  position: "bottom-center",
  margin: 36,
  fontSize: 11,
  color: "#000000",
  startNumber: 1,
};

export function toRoman(value: number): string {
  if (!Number.isInteger(value) || value < 1 || value > 3999) {
    throw new RangeError("Roman numerals only cover 1 to 3999.");
  }

  const table: Array<[number, string]> = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"],
    [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  let remaining = value;
  let result = "";

  for (const [amount, symbol] of table) {
    while (remaining >= amount) {
      result += symbol;
      remaining -= amount;
    }
  }

  return result;
}

export function formatNumber(value: number, style: NumberStyle): string {
  if (style === "roman-upper") return toRoman(value);
  if (style === "roman-lower") return toRoman(value).toLowerCase();
  return String(value);
}

export function formatPageLabel(format: string, value: number, lastValue: number, style: NumberStyle): string {
  return format.replace(/\{n\}/g, formatNumber(value, style)).replace(/\{total\}/g, formatNumber(lastValue, style));
}

/** Returns an error message for options that can't be applied, or null if they are fine. */
export function validatePageNumberOptions(options: PageNumberOptions): string | null {
  if (!options.format.includes("{n}")) return "The label format must contain {n} so each page gets its number.";
  if (!Number.isInteger(options.startNumber) || options.startNumber < 1) return "The starting number must be a whole number of 1 or more.";
  if (options.startNumber + options.pages.length - 1 > 3999 && options.style !== "arabic") return "Roman numerals only go up to 3999.";
  if (!(options.fontSize >= 4 && options.fontSize <= 72)) return "Font size must be between 4 and 72 points.";
  if (!(options.margin >= 0 && options.margin <= 200)) return "Margin must be between 0 and 200 points.";
  if (!parseHexColor(options.color)) return "Choose a valid text color.";
  if (options.pages.length === 0) return "Select at least one page to number.";

  const unsupported = findUnsupportedStandardFontCharacter(options.format);
  if (unsupported) {
    return `The character "${unsupported}" can't be drawn: PDF page numbers use a built-in font that only supports Western European characters.`;
  }

  return null;
}

/** Baseline-left position of a label in displayed coordinates (origin bottom-left of the visible page). */
export function computeLabelPosition(input: {
  displayWidth: number;
  displayHeight: number;
  textWidth: number;
  textHeight: number;
  position: NumberPosition;
  margin: number;
}): { x: number; y: number } {
  const { displayWidth, displayHeight, textWidth, textHeight, position, margin } = input;
  const horizontal = position.endsWith("left") ? "left" : position.endsWith("right") ? "right" : "center";
  const vertical = position.startsWith("top") ? "top" : "bottom";

  let x = horizontal === "left" ? margin : horizontal === "right" ? displayWidth - margin - textWidth : (displayWidth - textWidth) / 2;
  // Keep the label on the page even when the page is tiny or the margin is large.
  x = Math.max(0, Math.min(x, Math.max(0, displayWidth - textWidth)));

  let y = vertical === "bottom" ? margin : displayHeight - margin - textHeight;
  y = Math.max(0, Math.min(y, Math.max(0, displayHeight - textHeight)));

  return { x, y };
}

export type PageNumberResult = { bytes: Uint8Array; numberedPages: number; firstLabel: string; lastLabel: string };

/** Adds page numbers to the selected pages of a PDF and returns the new file's bytes. */
export async function addPageNumbers(pdfLib: PdfLib, source: Uint8Array | ArrayBuffer, options: PageNumberOptions): Promise<PageNumberResult> {
  const invalid = validatePageNumberOptions(options);
  if (invalid) throw new Error(invalid);

  const doc = await pdfLib.PDFDocument.load(source, { updateMetadata: false });
  const pages = doc.getPages();
  const outOfRange = options.pages.find((page) => page < 1 || page > pages.length);

  if (outOfRange !== undefined) {
    throw new Error(`Page ${outOfRange} does not exist: this PDF has ${pages.length} pages.`);
  }

  const font = await doc.embedFont(pdfLib.StandardFonts.Helvetica);
  const color = parseHexColor(options.color)!;
  const lastNumber = options.startNumber + options.pages.length - 1;
  const textHeight = font.heightAtSize(options.fontSize, { descender: false });
  let firstLabel = "";
  let lastLabel = "";

  options.pages.forEach((pageNumber, index) => {
    const page = pages[pageNumber - 1];
    const label = formatPageLabel(options.format, options.startNumber + index, lastNumber, options.style);
    const box = page.getCropBox();
    const rotation = normalizeRotation(page.getRotation().angle);
    const size = displayedSize(box, rotation);
    const textWidth = font.widthOfTextAtSize(label, options.fontSize);
    const displayed = computeLabelPosition({
      displayWidth: size.width,
      displayHeight: size.height,
      textWidth,
      textHeight,
      position: options.position,
      margin: options.margin,
    });
    const raw = displayedToRaw(box, rotation, displayed.x, displayed.y);

    page.drawText(label, {
      x: raw.x,
      y: raw.y,
      size: options.fontSize,
      font,
      color: pdfLib.rgb(color.r, color.g, color.b),
      rotate: pdfLib.degrees(displayedToRawAngle(rotation, 0)),
    });

    if (index === 0) firstLabel = label;
    lastLabel = label;
  });

  return { bytes: await doc.save(), numberedPages: options.pages.length, firstLabel, lastLabel };
}
