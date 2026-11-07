/**
 * Helpers for tests that need real PDF files: build one with pdf-lib, then read the result back
 * with PDF.js (the same engine the app uses to render). Only imported from *.test.ts files.
 */
import * as pdfLib from "pdf-lib";

export type TestPage = {
  width: number;
  height: number;
  rotation?: 0 | 90 | 180 | 270;
  text?: string;
  /** [x, y, width, height] */
  cropBox?: [number, number, number, number];
  /** [x, y, width, height]; defaults to [0, 0, width, height]. */
  mediaBoxOrigin?: [number, number];
};

export async function makePdf(pages: TestPage[]): Promise<Uint8Array> {
  const doc = await pdfLib.PDFDocument.create();
  const font = await doc.embedFont(pdfLib.StandardFonts.Helvetica);

  pages.forEach((spec, index) => {
    const page = doc.addPage([spec.width, spec.height]);
    if (spec.mediaBoxOrigin) {
      page.setMediaBox(spec.mediaBoxOrigin[0], spec.mediaBoxOrigin[1], spec.width, spec.height);
    }
    if (spec.rotation) page.setRotation(pdfLib.degrees(spec.rotation));
    if (spec.cropBox) page.setCropBox(...spec.cropBox);
    page.drawText(spec.text ?? `Original page ${index + 1}`, { x: 20, y: 20, size: 10, font });
  });

  return doc.save();
}

export type ExtractedItem = { str: string; transform: number[] };
export type ExtractedPage = { items: ExtractedItem[]; rotate: number; view: number[]; imageCount: number };

export async function readPdf(bytes: Uint8Array): Promise<ExtractedPage[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = pdfjs.getDocument({ data: new Uint8Array(bytes), verbosity: 0 });
  const loaded = await task.promise;
  const result: ExtractedPage[] = [];

  for (let number = 1; number <= loaded.numPages; number += 1) {
    const page = await loaded.getPage(number);
    const content = await page.getTextContent();
    const operators = await page.getOperatorList();
    const imageCount = operators.fnArray.filter(
      (op) => op === pdfjs.OPS.paintImageXObject || op === pdfjs.OPS.paintInlineImageXObject,
    ).length;

    result.push({
      items: content.items.flatMap((item) => ("str" in item ? [{ str: item.str, transform: item.transform as number[] }] : [])),
      rotate: page.rotate,
      view: page.view as number[],
      imageCount,
    });
    page.cleanup();
  }

  await task.destroy();
  return result;
}

/** A solid-colour RGB PNG, built by hand so tests don't need an image library. */
export function makePng(width: number, height: number, rgb: [number, number, number]): Uint8Array {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- node:zlib is only needed in tests
  const { deflateSync } = require("node:zlib") as typeof import("node:zlib");

  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc32 = (data: Uint8Array) => {
    let c = 0xffffffff;
    for (const byte of data) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Uint8Array) => {
    const out = new Uint8Array(12 + data.length);
    const view = new DataView(out.buffer);
    view.setUint32(0, data.length);
    out.set(new TextEncoder().encode(type), 4);
    out.set(data, 8);
    view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
    return out;
  };

  const header = new Uint8Array(13);
  const headerView = new DataView(header.buffer);
  headerView.setUint32(0, width);
  headerView.setUint32(4, height);
  header.set([8, 2, 0, 0, 0], 8); // 8-bit, RGB, no interlace

  const row = new Uint8Array(1 + width * 3);
  for (let x = 0; x < width; x += 1) row.set(rgb, 1 + x * 3);
  const raw = new Uint8Array(row.length * height);
  for (let y = 0; y < height; y += 1) raw.set(row, y * row.length);

  const parts = [
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", new Uint8Array(deflateSync(raw))),
    chunk("IEND", new Uint8Array(0)),
  ];
  const png = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    png.set(part, offset);
    offset += part.length;
  }
  return png;
}
