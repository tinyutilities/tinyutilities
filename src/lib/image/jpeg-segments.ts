/**
 * Lossless JPEG metadata removal by stripping marker segments — never decodes or re-encodes the
 * image, so compressed pixel data is untouched byte-for-byte. A JPEG file is SOI, then a run of
 * marker segments (most carry a 2-byte length), then SOS followed by entropy-coded scan data that
 * runs to EOI (possibly with more scans for a progressive JPEG). Metadata only ever appears in the
 * marker segments before the first SOS, so everything from SOS onward is copied verbatim.
 */

const SOI = 0xd8;
const EOI = 0xd9;
const SOS = 0xda;
const COM = 0xfe;

/** Standalone markers with no length field / payload (TEM, RSTn). */
function isStandalone(marker: number): boolean {
  return marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7);
}

/** APP1 (EXIF/XMP), APP13 (Photoshop IRB/IPTC) and COM (comments) carry the personal/software
 *  metadata this tool removes. APP0 (JFIF), APP2 (often an ICC colour profile) and APP14 (Adobe
 *  colour-transform flag) affect colour or decoding, not privacy, so they are kept. */
function isMetadataMarker(marker: number): boolean {
  return marker === 0xe1 || marker === 0xed || marker === COM;
}

/** SOFn (Start Of Frame) markers: baseline/progressive/etc, but not DHT (0xC4), JPG (0xC8) or
 *  DAC (0xCC), which share the 0xCx range without being frame headers. */
function isSofMarker(marker: number): boolean {
  return marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
}

/**
 * Reads the image's raw, physically-encoded pixel dimensions straight from its SOF marker — the
 * JPEG format's own, always-present record of the compressed data's actual width/height,
 * unaffected by (and with no dependency on) any EXIF Orientation tag. Used to tell whether a
 * given `createImageBitmap()` call already rotated its output to match that tag: browsers
 * disagree on whether `{ imageOrientation: "none" }` is honoured, so comparing a decoded
 * bitmap's size against this ground truth is the reliable way to tell, rather than trusting that
 * option name alone.
 */
export function readJpegPixelDimensions(input: Uint8Array): { width: number; height: number } | null {
  if (input.length < 4 || input[0] !== 0xff || input[1] !== SOI) return null;

  let offset = 2;

  while (offset + 1 < input.length) {
    if (input[offset] !== 0xff) return null;

    let markerOffset = offset;
    while (markerOffset < input.length && input[markerOffset + 1] === 0xff) markerOffset += 1;
    const marker = input[markerOffset + 1];

    if (marker === EOI || marker === SOS) return null;

    if (isStandalone(marker)) {
      offset = markerOffset + 2;
      continue;
    }

    if (input.length < markerOffset + 9) return null;
    const length = (input[markerOffset + 2] << 8) | input[markerOffset + 3];

    if (isSofMarker(marker)) {
      return {
        height: (input[markerOffset + 5] << 8) | input[markerOffset + 6],
        width: (input[markerOffset + 7] << 8) | input[markerOffset + 8],
      };
    }

    offset = markerOffset + 2 + length;
  }

  return null;
}

export type JpegStripResult = { bytes: Uint8Array; removedMarkers: number[] };

export function stripJpegMetadata(input: Uint8Array): JpegStripResult {
  if (input.length < 4 || input[0] !== 0xff || input[1] !== SOI) {
    throw new Error("Not a valid JPEG file (missing SOI marker).");
  }

  const output: number[] = [0xff, SOI];
  const removedMarkers: number[] = [];
  let offset = 2;

  while (offset < input.length) {
    if (input[offset] !== 0xff) {
      throw new Error("This JPEG is malformed (expected a marker).");
    }

    // Skip fill bytes (0xFF padding before a marker).
    let markerOffset = offset;
    while (markerOffset < input.length && input[markerOffset + 1] === 0xff) markerOffset += 1;

    const marker = input[markerOffset + 1];

    if (marker === EOI) {
      output.push(0xff, EOI);
      offset = markerOffset + 2;
      break;
    }

    if (isStandalone(marker)) {
      output.push(0xff, marker);
      offset = markerOffset + 2;
      continue;
    }

    if (input.length < markerOffset + 4) {
      throw new Error("This JPEG is truncated.");
    }

    const length = (input[markerOffset + 2] << 8) | input[markerOffset + 3];
    const segmentEnd = markerOffset + 2 + length;

    if (length < 2 || segmentEnd > input.length) {
      throw new Error("This JPEG is malformed (invalid segment length).");
    }

    if (isMetadataMarker(marker)) {
      removedMarkers.push(marker);
    } else {
      for (let i = markerOffset; i < segmentEnd; i += 1) output.push(input[i]);
    }

    if (marker === SOS) {
      // Everything from here to EOI is entropy-coded scan data (and, for a progressive JPEG,
      // further scans) — copy it unchanged rather than trying to parse inside it.
      for (let i = segmentEnd; i < input.length; i += 1) output.push(input[i]);
      return { bytes: Uint8Array.from(output), removedMarkers };
    }

    offset = segmentEnd;
  }

  return { bytes: Uint8Array.from(output), removedMarkers };
}
