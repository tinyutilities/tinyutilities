/**
 * Builds minimal, real-enough JPEG/PNG/WebP fixtures for tests — not visually decodable (no test
 * environment here has a canvas), but byte-correct enough for `exifr` to read embedded EXIF and
 * for this module's own marker/chunk walkers to parse and strip correctly. Test-only; never
 * imported from production code.
 */

function asciiZ(value: string): number[] {
  return [...value].map((char) => char.charCodeAt(0)).concat(0);
}

function u16le(value: number): number[] {
  return [value & 0xff, (value >> 8) & 0xff];
}

function u32le(value: number): number[] {
  return [value & 0xff, (value >> 8) & 0xff, (value >> 16) & 0xff, (value >> 24) & 0xff];
}

export type GpsFixture = { latitude: number; longitude: number };

/** A minimal, valid little-endian TIFF/EXIF buffer with IFD0 (Make/Model/Orientation) and an
 *  optional GPS sub-IFD — the payload a real JPEG APP1 "Exif\0\0" segment, PNG eXIf chunk, or
 *  WebP EXIF chunk carries. */
export function buildExifTiff(options: { make?: string; model?: string; orientation?: number; gps?: GpsFixture } = {}): Uint8Array {
  const { make, model, orientation, gps } = options;
  type Entry = { tag: number; type: number; count: number; valueBytes: number[]; isOffset: boolean };
  const entries: Entry[] = [];
  const extraData: number[] = [];
  const extraDataBase = 0; // patched below once the IFD size is known

  const addAscii = (tag: number, text: string) => {
    const bytes = asciiZ(text);
    entries.push({ tag, type: 2, count: bytes.length, valueBytes: bytes, isOffset: bytes.length > 4 });
  };
  const addShort = (tag: number, value: number) => {
    entries.push({ tag, type: 3, count: 1, valueBytes: u16le(value).concat([0, 0]), isOffset: false });
  };

  if (make) addAscii(0x010f, make);
  if (model) addAscii(0x0110, model);
  if (orientation !== undefined) addShort(0x0112, orientation);

  let gpsIfdEntry: Entry | null = null;
  if (gps) {
    gpsIfdEntry = { tag: 0x8825, type: 4, count: 1, valueBytes: [0, 0, 0, 0], isOffset: false };
    entries.push(gpsIfdEntry);
  }

  entries.sort((a, b) => a.tag - b.tag);

  const ifd0EntryCount = entries.length;
  const ifd0Start = 8; // right after the 8-byte TIFF header
  const ifd0Size = 2 + ifd0EntryCount * 12 + 4;
  let dataCursor = ifd0Start + ifd0Size;

  const ifd0Bytes: number[] = [...u16le(ifd0EntryCount)];
  for (const entry of entries) {
    ifd0Bytes.push(...u16le(entry.tag), ...u16le(entry.type), ...u32le(entry.count));
    if (entry.isOffset) {
      ifd0Bytes.push(...u32le(dataCursor + extraDataBase));
      extraData.push(...entry.valueBytes);
      if (extraData.length % 2 === 1) extraData.push(0); // word-align, harmless
      dataCursor += entry.valueBytes.length + (entry.valueBytes.length % 2);
    } else {
      const inline = entry.valueBytes.slice(0, 4);
      while (inline.length < 4) inline.push(0);
      ifd0Bytes.push(...inline);
    }
  }
  ifd0Bytes.push(...u32le(0)); // no IFD1

  let gpsData: number[] = [];
  if (gps && gpsIfdEntry) {
    const gpsIfdOffset = dataCursor;
    const toRational = (value: number): number[] => [...u32le(Math.round(Math.abs(value) * 1_000_000)), ...u32le(1_000_000)];

    const gpsEntries: Array<{ tag: number; type: number; count: number; valueBytes: number[]; isOffset: boolean }> = [
      { tag: 0x0001, type: 2, count: 2, valueBytes: asciiZ(gps.latitude >= 0 ? "N" : "S"), isOffset: false },
      { tag: 0x0002, type: 5, count: 3, valueBytes: [...toRational(gps.latitude), ...toRational(0), ...toRational(0)], isOffset: true },
      { tag: 0x0003, type: 2, count: 2, valueBytes: asciiZ(gps.longitude >= 0 ? "E" : "W"), isOffset: false },
      { tag: 0x0004, type: 5, count: 3, valueBytes: [...toRational(gps.longitude), ...toRational(0), ...toRational(0)], isOffset: true },
    ];

    const gpsIfdSize = 2 + gpsEntries.length * 12 + 4;
    let gpsDataCursor = gpsIfdOffset + gpsIfdSize;
    const gpsIfdBytes: number[] = [...u16le(gpsEntries.length)];
    const gpsExtra: number[] = [];

    for (const entry of gpsEntries) {
      gpsIfdBytes.push(...u16le(entry.tag), ...u16le(entry.type), ...u32le(entry.count));
      if (entry.isOffset) {
        gpsIfdBytes.push(...u32le(gpsDataCursor));
        gpsExtra.push(...entry.valueBytes);
        gpsDataCursor += entry.valueBytes.length;
      } else {
        const inline = entry.valueBytes.slice(0, 4);
        while (inline.length < 4) inline.push(0);
        gpsIfdBytes.push(...inline);
      }
    }
    gpsIfdBytes.push(...u32le(0));

    gpsData = [...gpsIfdBytes, ...gpsExtra];
    gpsIfdEntry.valueBytes = u32le(gpsIfdOffset);
    // Patch the already-written IFD0 bytes for the GPS pointer's offset value.
    const entryIndex = entries.indexOf(gpsIfdEntry);
    const patchOffset = 2 + entryIndex * 12 + 8;
    for (let i = 0; i < 4; i += 1) ifd0Bytes[patchOffset + i] = gpsIfdEntry.valueBytes[i];
  }

  const header = [0x49, 0x49, 0x2a, 0x00, ...u32le(ifd0Start)]; // "II" + 42 + offset to IFD0
  return Uint8Array.from([...header, ...ifd0Bytes, ...extraData, ...gpsData]);
}

function jpegSegment(marker: number, payload: number[]): number[] {
  const length = payload.length + 2;
  return [0xff, marker, (length >> 8) & 0xff, length & 0xff, ...payload];
}

export function makeJpegFixture(
  options: { make?: string; model?: string; orientation?: number; gps?: GpsFixture; comment?: string; photoshop?: boolean } = {},
): Uint8Array {
  const bytes: number[] = [0xff, 0xd8]; // SOI
  bytes.push(...jpegSegment(0xe0, [0x4a, 0x46, 0x49, 0x46, 0x00, 1, 1, 0, 0, 1, 0, 1, 0, 0])); // APP0 JFIF

  if (options.make || options.model || options.orientation !== undefined || options.gps) {
    const tiff = buildExifTiff(options);
    bytes.push(...jpegSegment(0xe1, [...asciiZ("Exif").slice(0, 4), 0x00, 0x00, ...tiff]));
  }

  if (options.photoshop) {
    bytes.push(...jpegSegment(0xed, [...asciiZ("Photoshop 3.0").slice(0, -1), 0x00, 0x3c, 0x3c, 0x3c]));
  }

  if (options.comment) {
    bytes.push(...jpegSegment(0xfe, [...options.comment].map((char) => char.charCodeAt(0))));
  }

  bytes.push(...jpegSegment(0xdb, [0x00, ...new Array(64).fill(1)])); // fake DQT
  bytes.push(...jpegSegment(0xc0, [8, 0, 8, 0, 8, 1, 1, 0x11, 0])); // fake baseline SOF0, 8x8, 1 component
  bytes.push(...jpegSegment(0xc4, [0x00, ...new Array(16).fill(0), 1])); // fake DHT
  bytes.push(...jpegSegment(0xda, [1, 1, 0, 0, 0, 0])); // fake SOS header
  bytes.push(0x11, 0x22, 0x33, 0x44); // fake entropy-coded scan data
  bytes.push(0xff, 0xd9); // EOI
  return Uint8Array.from(bytes);
}

/** A real, zlib-deflated PNG (reusing the approach from `src/lib/pdf/test-utils.ts`), optionally
 *  with ancillary metadata chunks inserted before IDAT. */
export function makePngFixture(options: {
  width?: number;
  height?: number;
  rgb?: [number, number, number];
  text?: Array<[string, string]>;
  exifTiff?: Uint8Array;
  time?: [number, number, number, number, number, number];
} = {}): Uint8Array {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- node:zlib is only needed in tests
  const { deflateSync } = require("node:zlib") as typeof import("node:zlib");
  const width = options.width ?? 4;
  const height = options.height ?? 4;
  const [r, g, b] = options.rgb ?? [100, 150, 200];

  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc32 = (data: number[]) => {
    let c = 0xffffffff;
    for (const byte of data) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: number[]): number[] => {
    const typeBytes = [...type].map((char) => char.charCodeAt(0));
    const body = [...typeBytes, ...data];
    const crc = crc32(body);
    return [...bigEndian32(data.length), ...body, ...bigEndian32(crc)];
  };
  function bigEndian32(value: number): number[] {
    return [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff];
  }

  const ihdr = [...bigEndian32(width), ...bigEndian32(height), 8, 2, 0, 0, 0];
  const row = [0, ...new Array(width * 3).fill(0).map((_, i) => [r, g, b][i % 3])];
  const raw = new Array(height).fill(row).flat();
  const idat = Array.from(deflateSync(Uint8Array.from(raw)));

  const parts: number[] = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  parts.push(...chunk("IHDR", ihdr));

  for (const [keyword, value] of options.text ?? []) {
    parts.push(...chunk("tEXt", [...[...keyword].map((c) => c.charCodeAt(0)), 0, ...[...value].map((c) => c.charCodeAt(0))]));
  }
  if (options.exifTiff) parts.push(...chunk("eXIf", Array.from(options.exifTiff)));
  if (options.time) {
    const [year, month, day, hour, minute, second] = options.time;
    parts.push(...chunk("tIME", [(year >> 8) & 0xff, year & 0xff, month, day, hour, minute, second]));
  }

  parts.push(...chunk("IDAT", idat));
  parts.push(...chunk("IEND", []));
  return Uint8Array.from(parts);
}

function riffChunk(id: string, data: number[]): number[] {
  const bytes = [...[...id].map((char) => char.charCodeAt(0)), ...u32le(data.length), ...data];
  if (data.length % 2 === 1) bytes.push(0);
  return bytes;
}

/** A syntactically valid WebP container (not a decodable image) with a minimal VP8 chunk,
 *  optionally with an EXIF and/or XMP chunk. */
export function makeWebpFixture(options: { exifTiff?: Uint8Array; xmp?: string } = {}): Uint8Array {
  const chunks: number[] = [];
  chunks.push(...riffChunk("VP8 ", [0x30, 0x01, 0x00, 0x9d, 0x01, 0x2a, 4, 0, 4, 0]));
  if (options.exifTiff) chunks.push(...riffChunk("EXIF", Array.from(options.exifTiff)));
  if (options.xmp) chunks.push(...riffChunk("XMP ", [...options.xmp].map((char) => char.charCodeAt(0))));

  const riffSize = 4 + chunks.length;
  return Uint8Array.from([0x52, 0x49, 0x46, 0x46, ...u32le(riffSize), 0x57, 0x45, 0x42, 0x50, ...chunks]);
}
