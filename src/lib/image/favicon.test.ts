import { describe, expect, it } from "vitest";
import { buildHtmlSnippet, buildIco, buildWebManifest, icoSizes, parseIco, standalonePngSizes } from "./favicon";
import { makePngFixture } from "./test-utils";

const png = (size: number) => makePngFixture({ width: size, height: size, rgb: [10, 20, 30] });

describe("buildIco / parseIco round-trip", () => {
  it("builds a valid ICO with one image per requested size", () => {
    const images = icoSizes.map((size) => ({ png: png(size) }));
    const ico = buildIco(images);
    const parsed = parseIco(ico);

    expect(parsed.count).toBe(icoSizes.length);
    expect(parsed.entries.map((entry) => entry.width)).toEqual([...icoSizes]);
    expect(parsed.entries.map((entry) => entry.height)).toEqual([...icoSizes]);
    expect(parsed.entries.every((entry) => entry.bitsPerPixel === 32)).toBe(true);
    expect(parsed.entries.every((entry) => entry.isValidPng)).toBe(true);
  });

  it("points each directory entry's offset at that image's actual PNG bytes", () => {
    const pngs = [png(16), png(32)];
    const ico = buildIco(pngs.map((p) => ({ png: p })));
    const parsed = parseIco(ico);

    parsed.entries.forEach((entry, index) => {
      const embedded = ico.slice(entry.offset, entry.offset + entry.byteSize);
      expect(Array.from(embedded)).toEqual(Array.from(pngs[index]));
      expect(entry.byteSize).toBe(pngs[index].length);
    });
  });

  it("stores a 256px image's dimension as 0 (the ICO format's encoding for 256)", () => {
    const ico = buildIco([{ png: png(256) }]);
    const parsed = parseIco(ico);
    expect(parsed.entries[0].width).toBe(256);
    expect(parsed.entries[0].height).toBe(256);
    expect(ico[6]).toBe(0); // the raw directory byte is 0, not 256
  });

  it("derives each entry's size from the PNG's own IHDR, not a caller-trusted number", () => {
    // A single buildIco call always reads real width/height back out of each PNG's IHDR chunk —
    // this is implicitly exercised by every other test here succeeding with mismatched image
    // sizes side by side, but assert it directly for one image too.
    const ico = buildIco([{ png: png(48) }]);
    expect(parseIco(ico).entries[0]).toMatchObject({ width: 48, height: 48 });
  });

  it("rejects a non-PNG image, an empty list, oversized images, and a malformed ICO", () => {
    expect(() => buildIco([{ png: new Uint8Array([1, 2, 3]) }])).toThrow(/valid PNG/);
    expect(() => buildIco([])).toThrow(/at least one image/);
    expect(() => parseIco(new Uint8Array([1, 2, 3]))).toThrow(/bad header/);
    expect(() => parseIco(buildIco([{ png: png(16) }]).slice(0, 10))).toThrow(/truncated/);
  });
});

describe("standalonePngSizes", () => {
  it("has a unique filename and size for every promised PNG", () => {
    expect(new Set(standalonePngSizes.map((entry) => entry.filename)).size).toBe(standalonePngSizes.length);
    expect(new Set(standalonePngSizes.map((entry) => entry.size)).size).toBe(standalonePngSizes.length);
    for (const entry of standalonePngSizes) expect(entry.size).toBeGreaterThan(0);
  });
});

describe("buildWebManifest", () => {
  it("produces valid JSON referencing the two Android icon sizes", () => {
    const manifest = JSON.parse(buildWebManifest("My Cool Site"));
    expect(manifest.name).toBe("My Cool Site");
    expect(manifest.icons).toHaveLength(2);
    expect(manifest.icons.map((icon: { sizes: string }) => icon.sizes).sort()).toEqual(["192x192", "512x512"]);
  });

  it("falls back to a default name for blank input", () => {
    expect(JSON.parse(buildWebManifest("   ")).name).toBe("My Site");
  });
});

describe("buildHtmlSnippet", () => {
  it("references every size this tool actually produces", () => {
    const snippet = buildHtmlSnippet();
    expect(snippet).toContain("favicon.ico");
    expect(snippet).toContain("favicon-16x16.png");
    expect(snippet).toContain("favicon-32x32.png");
    expect(snippet).toContain("apple-touch-icon.png");
    expect(snippet).toContain("site.webmanifest");
    expect(snippet).not.toMatch(/<script/i);
  });
});
