/**
 * Builds a favicon package: an ICO file containing several PNG-encoded sizes (the modern,
 * widely-supported "PNG-in-ICO" approach — every current browser and OS favicon consumer accepts
 * it, and it avoids writing a BMP/DIB encoder), plus the standalone PNG sizes sites commonly
 * reference directly (apple-touch-icon, Android Chrome icons), a web manifest, and the HTML
 * snippet to paste into `<head>`. Pure: callers render the PNGs (via canvas) and pass the bytes in.
 */

export const icoSizes = [16, 32, 48] as const;

export const standalonePngSizes: Array<{ size: number; filename: string; purpose: string }> = [
  { size: 16, filename: "favicon-16x16.png", purpose: "Browser tab (small)" },
  { size: 32, filename: "favicon-32x32.png", purpose: "Browser tab" },
  { size: 180, filename: "apple-touch-icon.png", purpose: "iOS home screen" },
  { size: 192, filename: "android-chrome-192x192.png", purpose: "Android home screen" },
  { size: 512, filename: "android-chrome-512x512.png", purpose: "Android splash / PWA" },
];

const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function isPng(bytes: Uint8Array): boolean {
  return bytes.length >= 8 && pngSignature.every((byte, index) => bytes[index] === byte);
}

/** Reads a PNG's own IHDR width/height, so the ICO directory entry always matches the real
 *  pixel dimensions of the PNG bytes it points to, even if a caller passed the wrong `size`. */
function readPngDimensions(bytes: Uint8Array): { width: number; height: number } {
  return {
    width: (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19],
    height: (bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23],
  };
}

function u32le(value: number): number[] {
  return [value & 0xff, (value >> 8) & 0xff, (value >> 16) & 0xff, (value >> 24) & 0xff];
}

export type IcoImage = { png: Uint8Array };

/** Builds a valid multi-size .ico file from one or more PNG-encoded images (ICONDIR + an
 *  ICONDIRENTRY per image + the PNG data, per the ICO file format). */
export function buildIco(images: IcoImage[]): Uint8Array {
  if (images.length === 0) {
    throw new Error("An ICO file needs at least one image.");
  }
  if (images.length > 255) {
    throw new Error("An ICO file can hold at most 255 images.");
  }

  for (const { png } of images) {
    if (!isPng(png)) throw new Error("Every image embedded in the ICO must be a valid PNG.");
    const { width, height } = readPngDimensions(png);
    if (width < 1 || width > 256 || height < 1 || height > 256) {
      throw new Error(`ICO images must be 1-256 px square; got ${width}x${height}.`);
    }
  }

  const directoryEntrySize = 16;
  const headerSize = 6;
  let dataOffset = headerSize + images.length * directoryEntrySize;

  const header = [0, 0, 1, 0, ...u16le(images.length)];
  const directory: number[] = [];
  const data: number[] = [];

  for (const { png } of images) {
    const { width, height } = readPngDimensions(png);
    directory.push(
      width === 256 ? 0 : width,
      height === 256 ? 0 : height,
      0, // colour count (0 = no palette, true colour)
      0, // reserved
      ...u16le(1), // colour planes
      ...u16le(32), // bits per pixel
      ...u32le(png.length),
      ...u32le(dataOffset),
    );
    data.push(...png);
    dataOffset += png.length;
  }

  return Uint8Array.from([...header, ...directory, ...data]);
}

function u16le(value: number): number[] {
  return [value & 0xff, (value >> 8) & 0xff];
}

export type ParsedIcoEntry = { width: number; height: number; bitsPerPixel: number; byteSize: number; offset: number; isValidPng: boolean };
export type ParsedIco = { count: number; entries: ParsedIcoEntry[] };

/** Parses an ICO file's own directory structure back out — used to verify `buildIco`'s output
 *  is actually well-formed, rather than just trusting that a download happened. */
export function parseIco(bytes: Uint8Array): ParsedIco {
  if (bytes.length < 6 || bytes[0] !== 0 || bytes[1] !== 0 || bytes[2] !== 1 || bytes[3] !== 0) {
    throw new Error("Not a valid ICO file (bad header).");
  }

  const count = bytes[4] | (bytes[5] << 8);
  const entries: ParsedIcoEntry[] = [];

  for (let index = 0; index < count; index += 1) {
    const base = 6 + index * 16;
    if (base + 16 > bytes.length) throw new Error("ICO directory is truncated.");

    const rawWidth = bytes[base];
    const rawHeight = bytes[base + 1];
    const bitsPerPixel = bytes[base + 6] | (bytes[base + 7] << 8);
    const byteSize = bytes[base + 8] | (bytes[base + 9] << 8) | (bytes[base + 10] << 16) | (bytes[base + 11] << 24);
    const offset = bytes[base + 12] | (bytes[base + 13] << 8) | (bytes[base + 14] << 16) | (bytes[base + 15] << 24);
    const isValidPng = offset + 8 <= bytes.length && pngSignature.every((byte, i) => bytes[offset + i] === byte);

    entries.push({ width: rawWidth === 0 ? 256 : rawWidth, height: rawHeight === 0 ? 256 : rawHeight, bitsPerPixel, byteSize, offset, isValidPng });
  }

  return { count, entries };
}

/** A minimal, valid `site.webmanifest`. */
export function buildWebManifest(siteName: string): string {
  const name = siteName.trim() || "My Site";
  return JSON.stringify(
    {
      name,
      short_name: name.slice(0, 12),
      icons: [
        { src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
        { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
      ],
      theme_color: "#ffffff",
      background_color: "#ffffff",
      display: "standalone",
    },
    null,
    2,
  );
}

/** The `<head>` snippet referencing every file in the package, so people can wire it up without
 *  guessing filenames or sizes. */
export function buildHtmlSnippet(): string {
  return [
    '<link rel="icon" href="/favicon.ico" sizes="any">',
    '<link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32">',
    '<link rel="icon" href="/favicon-16x16.png" type="image/png" sizes="16x16">',
    '<link rel="apple-touch-icon" href="/apple-touch-icon.png">',
    '<link rel="manifest" href="/site.webmanifest">',
  ].join("\n");
}
