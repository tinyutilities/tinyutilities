/**
 * Median-cut colour quantization: extracts a representative palette from raw RGBA pixel data.
 * Pure — the caller (the browser tool) downscales the source image via canvas first and passes
 * the resulting `ImageData`-shaped pixel buffer in, so this module needs no DOM/canvas itself and
 * is fully unit-testable with hand-built pixel arrays.
 *
 * Median-cut: start with one "box" containing every opaque pixel's colour. Repeatedly pick the
 * box with the most pixels, split it in half along its longest colour axis (sorting pixels by
 * that channel and cutting at the median), until there are enough boxes — then average each
 * box's pixels into one palette colour. Deterministic: ties are always broken by insertion order,
 * never by iteration order of a Set/Map or by `Math.random`.
 */

export type PaletteColor = {
  hex: string;
  rgb: { r: number; g: number; b: number };
  /** Share of considered (non-transparent) pixels this colour's box represents, 0-1. */
  population: number;
};

export type PaletteOptions = {
  colorCount: number;
  /** Pixels with alpha at or below this (0-255) are excluded from the palette entirely. */
  alphaThreshold: number;
};

export const defaultPaletteOptions: PaletteOptions = { colorCount: 6, alphaThreshold: 16 };
export const minColorCount = 2;
export const maxColorCount = 12;

type Box = { pixels: Uint8ClampedArray; indices: number[] };

function channelRange(pixels: Uint8ClampedArray, indices: number[], channel: 0 | 1 | 2): { min: number; max: number } {
  let min = 255;
  let max = 0;
  for (const index of indices) {
    const value = pixels[index * 4 + channel];
    if (value < min) min = value;
    if (value > max) max = value;
  }
  return { min, max };
}

function widestChannel(pixels: Uint8ClampedArray, indices: number[]): 0 | 1 | 2 {
  const ranges = [0, 1, 2].map((channel) => channelRange(pixels, indices, channel as 0 | 1 | 2));
  const widths = ranges.map((range) => range.max - range.min);
  const widest = Math.max(...widths);
  return widths.indexOf(widest) as 0 | 1 | 2;
}

function splitBox(pixels: Uint8ClampedArray, indices: number[]): [number[], number[]] {
  const channel = widestChannel(pixels, indices);
  // A stable sort keeps the split (and so the whole algorithm) deterministic for pixels that tie
  // on the sorted channel, rather than depending on the engine's sort implementation.
  const sorted = [...indices]
    .map((index, position) => ({ index, position }))
    .sort((a, b) => pixels[a.index * 4 + channel] - pixels[b.index * 4 + channel] || a.position - b.position)
    .map((entry) => entry.index);

  const mid = Math.ceil(sorted.length / 2);
  return [sorted.slice(0, mid), sorted.slice(mid)];
}

function averageColor(pixels: Uint8ClampedArray, indices: number[]): { r: number; g: number; b: number } {
  let r = 0;
  let g = 0;
  let b = 0;
  for (const index of indices) {
    r += pixels[index * 4];
    g += pixels[index * 4 + 1];
    b += pixels[index * 4 + 2];
  }
  const count = indices.length || 1;
  return { r: Math.round(r / count), g: Math.round(g / count), b: Math.round(b / count) };
}

function toHex({ r, g, b }: { r: number; g: number; b: number }): string {
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

export type ExtractPaletteResult =
  | { ok: true; colors: PaletteColor[]; consideredPixels: number; transparentPixels: number }
  | { ok: false; error: string };

/**
 * `pixels` is RGBA bytes in row-major order (the same layout `CanvasRenderingContext2D.
 * getImageData().data` uses) for an image of `width` × `height`.
 */
export function extractPalette(pixels: Uint8ClampedArray, width: number, height: number, options: PaletteOptions = defaultPaletteOptions): ExtractPaletteResult {
  const { colorCount, alphaThreshold } = options;

  if (!(colorCount >= minColorCount && colorCount <= maxColorCount)) {
    return { ok: false, error: `Choose between ${minColorCount} and ${maxColorCount} colors.` };
  }

  const totalPixels = width * height;
  if (pixels.length !== totalPixels * 4) {
    return { ok: false, error: "The pixel data doesn't match the given width and height." };
  }

  const opaqueIndices: number[] = [];
  for (let index = 0; index < totalPixels; index += 1) {
    if (pixels[index * 4 + 3] > alphaThreshold) opaqueIndices.push(index);
  }

  const transparentPixels = totalPixels - opaqueIndices.length;

  if (opaqueIndices.length === 0) {
    return { ok: false, error: "This image is fully transparent, so there is no color to extract." };
  }

  const boxes: Box[] = [{ pixels, indices: opaqueIndices }];

  // A box all one colour (every channel's min equals its max) has nothing left to gain from
  // splitting — every split of it would just be an arbitrary cut through identical pixels.
  const isUniform = (indices: number[]) => [0, 1, 2].every((channel) => {
    const range = channelRange(pixels, indices, channel as 0 | 1 | 2);
    return range.min === range.max;
  });

  while (boxes.length < colorCount) {
    // Split the largest splittable (non-uniform, >1 pixel) box; among equal sizes, the
    // earliest-created one — a fixed, reproducible choice rather than an implicit one.
    let largestIndex = -1;
    for (let i = 0; i < boxes.length; i += 1) {
      if (boxes[i].indices.length <= 1 || isUniform(boxes[i].indices)) continue;
      if (largestIndex === -1 || boxes[i].indices.length > boxes[largestIndex].indices.length) largestIndex = i;
    }

    if (largestIndex === -1) break; // every remaining box is a single colour or a single pixel

    const box = boxes[largestIndex];
    const [first, second] = splitBox(pixels, box.indices);
    boxes.splice(largestIndex, 1, { pixels, indices: first }, { pixels, indices: second });
  }

  // Merge boxes that converged on the exact same average colour (common for low-colour-count
  // source images or a quantization tie) into one entry, combining their pixel counts rather
  // than silently dropping either — so population always reflects every considered pixel.
  const byHex = new Map<string, { rgb: { r: number; g: number; b: number }; pixelCount: number }>();

  for (const box of boxes) {
    const rgb = averageColor(pixels, box.indices);
    const hex = toHex(rgb);
    const existing = byHex.get(hex);
    if (existing) existing.pixelCount += box.indices.length;
    else byHex.set(hex, { rgb, pixelCount: box.indices.length });
  }

  const colors: PaletteColor[] = [...byHex.entries()]
    .map(([hex, { rgb, pixelCount }]) => ({ hex, rgb, population: pixelCount / opaqueIndices.length }))
    .sort((a, b) => b.population - a.population);

  return { ok: true, colors, consideredPixels: opaqueIndices.length, transparentPixels };
}
