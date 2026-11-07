/**
 * Lossless WebP metadata removal by dropping RIFF chunks — image data (VP8/VP8L), alpha
 * (ALPH) and animation (ANIM/ANMF) chunks are identified by their chunk FourCC and copied through
 * unchanged. A WebP file is "RIFF" + size(4 LE) + "WEBP" + a sequence of
 * [FourCC(4) | size(4 LE) | data(size) | pad byte if size is odd].
 */

const strippedChunkIds = new Set(["EXIF", "XMP "]);

export type WebpStripResult = { bytes: Uint8Array; removedChunkIds: string[] };

/**
 * Returns the raw payload of a WebP RIFF chunk by its FourCC (e.g. "EXIF"), or null if the file
 * has no such chunk. Used to read metadata: `exifr` has no WebP support of its own, but it can
 * parse the EXIF chunk's payload directly, since that payload is just a plain TIFF/EXIF buffer.
 */
export function findWebpChunk(input: Uint8Array, id: string): Uint8Array | null {
  if (input.length < 12 || fourCc(input, 0) !== "RIFF" || fourCc(input, 8) !== "WEBP") return null;

  let offset = 12;
  while (offset + 8 <= input.length) {
    const chunkId = fourCc(input, offset);
    const size = input[offset + 4] | (input[offset + 5] << 8) | (input[offset + 6] << 16) | (input[offset + 7] << 24);
    const dataStart = offset + 8;
    const dataEnd = dataStart + size;
    if (size < 0 || dataEnd > input.length) return null;

    if (chunkId === id) return input.slice(dataStart, dataEnd);

    offset = dataEnd + (size % 2);
  }

  return null;
}

function fourCc(bytes: Uint8Array, offset: number): string {
  return String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
}

export function stripWebpMetadata(input: Uint8Array): WebpStripResult {
  if (input.length < 12 || fourCc(input, 0) !== "RIFF" || fourCc(input, 8) !== "WEBP") {
    throw new Error("Not a valid WebP file (missing RIFF/WEBP header).");
  }

  const body: number[] = [];
  const removedChunkIds: string[] = [];
  let offset = 12;

  while (offset < input.length) {
    if (offset + 8 > input.length) {
      throw new Error("This WebP file is truncated.");
    }

    const id = fourCc(input, offset);
    const size = input[offset + 4] | (input[offset + 5] << 8) | (input[offset + 6] << 16) | (input[offset + 7] << 24);
    const padding = size % 2;
    const chunkEnd = offset + 8 + size + padding;

    if (size < 0 || chunkEnd > input.length) {
      throw new Error("This WebP file is malformed (invalid chunk size).");
    }

    if (strippedChunkIds.has(id)) {
      removedChunkIds.push(id);
    } else {
      for (let i = offset; i < chunkEnd; i += 1) body.push(input[i]);
    }

    offset = chunkEnd;
  }

  const riffSize = 4 + body.length; // "WEBP" + chunks
  const header = [
    0x52, 0x49, 0x46, 0x46, // "RIFF"
    riffSize & 0xff, (riffSize >> 8) & 0xff, (riffSize >> 16) & 0xff, (riffSize >> 24) & 0xff,
    0x57, 0x45, 0x42, 0x50, // "WEBP"
  ];

  return { bytes: Uint8Array.from([...header, ...body]), removedChunkIds };
}
