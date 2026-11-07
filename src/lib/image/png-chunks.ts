/**
 * Lossless PNG metadata removal by dropping whole ancillary chunks — pixel data (IDAT), the
 * palette, transparency and any APNG animation chunks are never touched, because they are
 * identified by chunk type and simply copied through unchanged. A PNG is an 8-byte signature
 * followed by chunks of [length(4) | type(4) | data(length) | crc(4)].
 */

const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** tEXt/zTXt/iTXt carry arbitrary keyword/text pairs (often author, software, GPS as text);
 *  eXIf is a raw EXIF block (can include GPS); tIME is the last-modified timestamp. Everything
 *  else — IHDR/PLTE/IDAT/IEND/tRNS/gAMA/cHRM/sRGB/iCCP/pHYs/sBIT/hIST/sPLT/bKGD and the APNG
 *  acTL/fcTL/fdAT chunks — is image data, colour/animation info, not personal metadata. */
const strippedChunkTypes = new Set(["tEXt", "zTXt", "iTXt", "eXIf", "tIME"]);

export type PngStripResult = { bytes: Uint8Array; removedChunkTypes: string[] };

export function stripPngMetadata(input: Uint8Array): PngStripResult {
  if (input.length < 8 || !pngSignature.every((byte, index) => input[index] === byte)) {
    throw new Error("Not a valid PNG file (missing signature).");
  }

  const output: number[] = [...pngSignature];
  const removedChunkTypes: string[] = [];
  let offset = 8;

  while (offset < input.length) {
    if (offset + 8 > input.length) {
      throw new Error("This PNG is truncated.");
    }

    const length = (input[offset] << 24) | (input[offset + 1] << 16) | (input[offset + 2] << 8) | input[offset + 3];
    const type = String.fromCharCode(input[offset + 4], input[offset + 5], input[offset + 6], input[offset + 7]);
    const chunkEnd = offset + 12 + length;

    if (length < 0 || chunkEnd > input.length) {
      throw new Error("This PNG is malformed (invalid chunk length).");
    }

    if (strippedChunkTypes.has(type)) {
      removedChunkTypes.push(type);
    } else {
      for (let i = offset; i < chunkEnd; i += 1) output.push(input[i]);
    }

    offset = chunkEnd;

    if (type === "IEND") break;
  }

  return { bytes: Uint8Array.from(output), removedChunkTypes };
}
