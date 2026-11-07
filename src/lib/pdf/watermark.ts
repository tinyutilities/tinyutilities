import { findUnsupportedStandardFontCharacter, parseHexColor } from "./fonts";
import { displayedSize, displayedToRaw, displayedToRawAngle, normalizeRotation, rotateVector } from "./geometry";

type PdfLib = typeof import("pdf-lib");

export type WatermarkLayout = "center" | "tile";

type CommonOptions = {
  /** 0.05 – 1 */
  opacity: number;
  /** Degrees, counter-clockwise as seen on the page. -180 – 180 */
  rotation: number;
  layout: WatermarkLayout;
  /** 1-based pages to mark. */
  pages: number[];
};

export type TextWatermarkOptions = CommonOptions & {
  kind: "text";
  text: string;
  fontSize: number;
  /** "#rrggbb" */
  color: string;
};

export type ImageWatermarkOptions = CommonOptions & {
  kind: "image";
  bytes: Uint8Array;
  /** Width of the watermark as a percentage of the displayed page width. 5 – 100 */
  widthPercent: number;
};

export type WatermarkOptions = TextWatermarkOptions | ImageWatermarkOptions;

/** The most watermark copies one page may receive in tile mode. */
export const maxTilesPerPage = 150;

export function detectImageFormat(bytes: Uint8Array): "png" | "jpeg" | null {
  if (bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png";
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  return null;
}

export function validateWatermarkOptions(options: WatermarkOptions): string | null {
  if (options.pages.length === 0) return "Select at least one page to watermark.";
  if (!(options.opacity >= 0.05 && options.opacity <= 1)) return "Opacity must be between 5% and 100%.";
  if (!(options.rotation >= -180 && options.rotation <= 180)) return "Rotation must be between -180 and 180 degrees.";

  if (options.kind === "text") {
    if (options.text.trim() === "") return "Enter the watermark text.";
    if (options.text.length > 100) return "Keep the watermark text to 100 characters or fewer.";
    if (/[\r\n]/.test(options.text)) return "The watermark text must be a single line.";
    if (!(options.fontSize >= 8 && options.fontSize <= 300)) return "Font size must be between 8 and 300 points.";
    if (!parseHexColor(options.color)) return "Choose a valid text color.";

    const unsupported = findUnsupportedStandardFontCharacter(options.text);
    if (unsupported) {
      return `The character "${unsupported}" can't be drawn: text watermarks use a built-in font that only supports Western European characters. Use an image watermark for other scripts.`;
    }
    return null;
  }

  if (!detectImageFormat(options.bytes)) return "The watermark image must be a PNG or JPEG file.";
  if (!(options.widthPercent >= 5 && options.widthPercent <= 100)) return "Image width must be between 5% and 100% of the page width.";
  return null;
}

export type Placement = { anchorX: number; anchorY: number };

/**
 * Where to draw copies of an item (in displayed page coordinates). Drawing in pdf-lib rotates
 * around the item's bottom-left corner, so each result is that corner for the rotated item whose
 * centre is at the intended centre.
 */
export function computePlacements(input: {
  displayWidth: number;
  displayHeight: number;
  itemWidth: number;
  itemHeight: number;
  rotation: number;
  layout: WatermarkLayout;
}): { ok: true; placements: Placement[] } | { ok: false; error: string } {
  const { displayWidth, displayHeight, itemWidth, itemHeight, rotation, layout } = input;
  const radians = (rotation * Math.PI) / 180;
  const boundsWidth = Math.abs(itemWidth * Math.cos(radians)) + Math.abs(itemHeight * Math.sin(radians));
  const boundsHeight = Math.abs(itemWidth * Math.sin(radians)) + Math.abs(itemHeight * Math.cos(radians));

  const centers: Array<{ x: number; y: number }> = [];

  if (layout === "center") {
    centers.push({ x: displayWidth / 2, y: displayHeight / 2 });
  } else {
    const gap = Math.max(boundsHeight, boundsWidth) * 0.6;
    const stepX = boundsWidth + gap;
    const stepY = boundsHeight + gap;
    const columns = Math.ceil(displayWidth / stepX) + 2;
    const rows = Math.ceil(displayHeight / stepY) + 2;

    for (let row = -1; row < rows; row += 1) {
      for (let column = -1; column < columns; column += 1) {
        const x = column * stepX + (row % 2 === 0 ? 0 : stepX / 2) + stepX / 2;
        const y = row * stepY + stepY / 2;
        const intersects =
          x + boundsWidth / 2 > 0 && x - boundsWidth / 2 < displayWidth && y + boundsHeight / 2 > 0 && y - boundsHeight / 2 < displayHeight;
        if (intersects) centers.push({ x, y });
      }
    }

    if (centers.length > maxTilesPerPage) {
      return { ok: false, error: "That would place too many copies on a page. Increase the size or use the centered layout." };
    }
  }

  return {
    ok: true,
    placements: centers.map((center) => {
      const offset = rotateVector(itemWidth / 2, itemHeight / 2, rotation);
      return { anchorX: center.x - offset.x, anchorY: center.y - offset.y };
    }),
  };
}

export type WatermarkResult = { bytes: Uint8Array; watermarkedPages: number; copiesPerPage: number };

/** Draws the watermark on top of the selected pages' existing content and returns the new PDF. */
export async function addWatermark(pdfLib: PdfLib, source: Uint8Array | ArrayBuffer, options: WatermarkOptions): Promise<WatermarkResult> {
  const invalid = validateWatermarkOptions(options);
  if (invalid) throw new Error(invalid);

  const doc = await pdfLib.PDFDocument.load(source, { updateMetadata: false });
  const pages = doc.getPages();
  const outOfRange = options.pages.find((page) => page < 1 || page > pages.length);

  if (outOfRange !== undefined) {
    throw new Error(`Page ${outOfRange} does not exist: this PDF has ${pages.length} pages.`);
  }

  const font = options.kind === "text" ? await doc.embedFont(pdfLib.StandardFonts.HelveticaBold) : null;
  const image =
    options.kind === "image"
      ? detectImageFormat(options.bytes) === "png"
        ? await doc.embedPng(options.bytes)
        : await doc.embedJpg(options.bytes)
      : null;
  const textColor = options.kind === "text" ? parseHexColor(options.color)! : null;
  let copiesPerPage = 0;

  for (const pageNumber of options.pages) {
    const page = pages[pageNumber - 1];
    const box = page.getCropBox();
    const pageRotation = normalizeRotation(page.getRotation().angle);
    const size = displayedSize(box, pageRotation);

    let itemWidth: number;
    let itemHeight: number;

    if (options.kind === "text" && font) {
      itemWidth = font.widthOfTextAtSize(options.text, options.fontSize);
      itemHeight = font.heightAtSize(options.fontSize, { descender: false });
    } else if (image && options.kind === "image") {
      itemWidth = (size.width * options.widthPercent) / 100;
      itemHeight = (itemWidth * image.height) / image.width;
    } else {
      continue;
    }

    const layout = computePlacements({
      displayWidth: size.width,
      displayHeight: size.height,
      itemWidth,
      itemHeight,
      rotation: options.rotation,
      layout: options.layout,
    });

    if (!layout.ok) throw new Error(layout.error);
    copiesPerPage = Math.max(copiesPerPage, layout.placements.length);

    for (const placement of layout.placements) {
      const raw = displayedToRaw(box, pageRotation, placement.anchorX, placement.anchorY);
      const rotate = pdfLib.degrees(displayedToRawAngle(pageRotation, options.rotation));

      if (options.kind === "text" && font && textColor) {
        page.drawText(options.text, {
          x: raw.x,
          y: raw.y,
          size: options.fontSize,
          font,
          color: pdfLib.rgb(textColor.r, textColor.g, textColor.b),
          opacity: options.opacity,
          rotate,
        });
      } else if (image) {
        page.drawImage(image, { x: raw.x, y: raw.y, width: itemWidth, height: itemHeight, opacity: options.opacity, rotate });
      }
    }
  }

  return { bytes: await doc.save(), watermarkedPages: options.pages.length, copiesPerPage };
}
