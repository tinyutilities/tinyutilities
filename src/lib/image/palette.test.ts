import { describe, expect, it } from "vitest";
import { defaultPaletteOptions, extractPalette, maxColorCount, minColorCount } from "./palette";

/** Builds an RGBA pixel buffer from a function of (x, y) -> [r, g, b, a]. */
function makePixels(width: number, height: number, at: (x: number, y: number) => [number, number, number, number]): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const [r, g, b, a] = at(x, y);
      const index = (y * width + x) * 4;
      pixels[index] = r;
      pixels[index + 1] = g;
      pixels[index + 2] = b;
      pixels[index + 3] = a;
    }
  }
  return pixels;
}

const solid = (width: number, height: number, [r, g, b, a]: [number, number, number, number]) => makePixels(width, height, () => [r, g, b, a]);

describe("extractPalette — basic cases", () => {
  it("extracts two distinct, correct colors from a half-red half-blue image", () => {
    const pixels = makePixels(10, 10, (x) => (x < 5 ? [255, 0, 0, 255] : [0, 0, 255, 255]));
    const result = extractPalette(pixels, 10, 10, { colorCount: 2, alphaThreshold: 16 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const hexes = result.colors.map((color) => color.hex).sort();
    expect(hexes).toEqual(["#0000ff", "#ff0000"]);
    for (const color of result.colors) expect(color.population).toBeCloseTo(0.5, 5);
  });

  it("averages a gradient box into one representative colour per box", () => {
    // Four quadrants, each a solid colour, colorCount=4 should recover all four exactly.
    const quadrant = (x: number, y: number): [number, number, number, number] => {
      if (x < 5 && y < 5) return [255, 0, 0, 255];
      if (x >= 5 && y < 5) return [0, 255, 0, 255];
      if (x < 5 && y >= 5) return [0, 0, 255, 255];
      return [255, 255, 0, 255];
    };
    const result = extractPalette(makePixels(10, 10, quadrant), 10, 10, { colorCount: 4, alphaThreshold: 16 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.colors.map((color) => color.hex).sort()).toEqual(["#0000ff", "#00ff00", "#ff0000", "#ffff00"]);
  });

  it("is deterministic across repeated runs on the same input", () => {
    const pixels = makePixels(16, 16, (x, y) => [(x * 16) % 256, (y * 16) % 256, (x + y) % 256, 255]);
    const first = extractPalette(pixels, 16, 16, { colorCount: 6, alphaThreshold: 16 });
    const second = extractPalette(pixels, 16, 16, { colorCount: 6, alphaThreshold: 16 });
    expect(first).toEqual(second);
  });

  it("population values for every colour sum to (very close to) 1", () => {
    const pixels = makePixels(20, 20, (x, y) => [(x * 13) % 256, (y * 7) % 256, (x * y) % 256, 255]);
    const result = extractPalette(pixels, 20, 20, { colorCount: 8, alphaThreshold: 16 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const total = result.colors.reduce((sum, color) => sum + color.population, 0);
    expect(total).toBeCloseTo(1, 5);
  });
});

describe("extractPalette — few distinct colours", () => {
  it("returns only the actual number of distinct colours when fewer than requested", () => {
    const pixels = makePixels(10, 10, (x) => (x < 5 ? [10, 10, 10, 255] : [200, 200, 200, 255]));
    const result = extractPalette(pixels, 10, 10, { colorCount: 6, alphaThreshold: 16 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.colors).toHaveLength(2); // never padded with invented colours
  });

  it("returns exactly one colour for a single-colour image regardless of the requested count", () => {
    const result = extractPalette(solid(8, 8, [120, 60, 200, 255]), 8, 8, { colorCount: 6, alphaThreshold: 16 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.colors).toEqual([{ hex: "#783cc8", rgb: { r: 120, g: 60, b: 200 }, population: 1 }]);
  });

  it("handles a single-pixel image", () => {
    const result = extractPalette(solid(1, 1, [1, 2, 3, 255]), 1, 1, { colorCount: 6, alphaThreshold: 16 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.colors).toEqual([{ hex: "#010203", rgb: { r: 1, g: 2, b: 3 }, population: 1 }]);
  });
});

describe("extractPalette — transparency", () => {
  it("excludes transparent pixels from the palette and reports how many", () => {
    const pixels = makePixels(10, 10, (x) => (x < 4 ? [255, 0, 0, 0] : [0, 255, 0, 255]));
    const result = extractPalette(pixels, 10, 10, { colorCount: 2, alphaThreshold: 16 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.transparentPixels).toBe(40);
    expect(result.consideredPixels).toBe(60);
    expect(result.colors).toEqual([{ hex: "#00ff00", rgb: { r: 0, g: 255, b: 0 }, population: 1 }]);
  });

  it("respects the alpha threshold boundary", () => {
    const pixels = makePixels(2, 1, (x) => (x === 0 ? [255, 0, 0, 16] : [0, 255, 0, 17]));
    const result = extractPalette(pixels, 2, 1, { colorCount: 2, alphaThreshold: 16 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // alpha=16 is AT the threshold (excluded, "at or below"); alpha=17 is above it (included).
    expect(result.consideredPixels).toBe(1);
    expect(result.colors).toEqual([{ hex: "#00ff00", rgb: { r: 0, g: 255, b: 0 }, population: 1 }]);
  });

  it("fails clearly for a fully transparent image instead of returning a fake colour", () => {
    const result = extractPalette(solid(4, 4, [255, 0, 0, 0]), 4, 4, defaultPaletteOptions);
    expect(result).toEqual({ ok: false, error: "This image is fully transparent, so there is no color to extract." });
  });
});

describe("extractPalette — validation", () => {
  it("rejects a color count outside the supported range", () => {
    expect(extractPalette(solid(2, 2, [1, 2, 3, 255]), 2, 2, { colorCount: 1, alphaThreshold: 16 }).ok).toBe(false);
    expect(extractPalette(solid(2, 2, [1, 2, 3, 255]), 2, 2, { colorCount: maxColorCount + 1, alphaThreshold: 16 }).ok).toBe(false);
    expect(extractPalette(solid(2, 2, [1, 2, 3, 255]), 2, 2, { colorCount: minColorCount, alphaThreshold: 16 }).ok).toBe(true);
    expect(extractPalette(solid(2, 2, [1, 2, 3, 255]), 2, 2, { colorCount: maxColorCount, alphaThreshold: 16 }).ok).toBe(true);
  });

  it("rejects pixel data whose length doesn't match width × height × 4", () => {
    const result = extractPalette(new Uint8ClampedArray(10), 10, 10, defaultPaletteOptions);
    expect(result).toEqual({ ok: false, error: "The pixel data doesn't match the given width and height." });
  });
});
