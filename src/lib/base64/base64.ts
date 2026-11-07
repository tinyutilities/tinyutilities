/**
 * Base64 (RFC 4648) encoding and decoding over raw bytes, with no dependency on `btoa`/`atob`
 * (which only handle Latin-1 strings). Pure and environment-independent so it can be unit tested.
 */

const standardAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const urlSafeAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

const decodeTable = (() => {
  const table = new Int16Array(128).fill(-1);
  for (let index = 0; index < 64; index += 1) {
    table[standardAlphabet.charCodeAt(index)] = index;
  }
  // Accept the URL-safe alphabet too; both are decoded without the user having to say which.
  table["-".charCodeAt(0)] = 62;
  table["_".charCodeAt(0)] = 63;
  return table;
})();

export type Base64EncodeOptions = {
  /** Use the URL- and filename-safe alphabet ("-" and "_" instead of "+" and "/"). */
  urlSafe?: boolean;
  /** Append "=" padding. Defaults to true. */
  padding?: boolean;
  /** Insert a line break every N output characters (e.g. 76 for MIME). 0 or undefined = one line. */
  lineLength?: number;
};

export class Base64Error extends Error {}

export function bytesToBase64(bytes: Uint8Array, options: Base64EncodeOptions = {}): string {
  const alphabet = options.urlSafe ? urlSafeAlphabet : standardAlphabet;
  const padding = options.padding ?? true;
  const parts: string[] = [];
  const chunkSize = 3 * 4096;

  for (let start = 0; start < bytes.length; start += chunkSize) {
    const end = Math.min(start + chunkSize, bytes.length);
    let chunk = "";

    for (let index = start; index < end; index += 3) {
      const first = bytes[index];
      const second = index + 1 < bytes.length ? bytes[index + 1] : 0;
      const third = index + 2 < bytes.length ? bytes[index + 2] : 0;
      const remaining = bytes.length - index;

      chunk += alphabet[first >> 2];
      chunk += alphabet[((first & 0x03) << 4) | (second >> 4)];
      chunk += remaining > 1 ? alphabet[((second & 0x0f) << 2) | (third >> 6)] : padding ? "=" : "";
      chunk += remaining > 2 ? alphabet[third & 0x3f] : padding ? "=" : "";
    }

    parts.push(chunk);
  }

  const encoded = parts.join("");
  const lineLength = options.lineLength ?? 0;

  if (lineLength > 0 && encoded.length > lineLength) {
    const lines: string[] = [];
    for (let index = 0; index < encoded.length; index += lineLength) {
      lines.push(encoded.slice(index, index + lineLength));
    }
    return lines.join("\n");
  }

  return encoded;
}

export function encodeTextToBase64(text: string, options: Base64EncodeOptions = {}): string {
  return bytesToBase64(new TextEncoder().encode(text), options);
}

export type ParsedBase64Input = {
  /** The Base64 payload with any `data:` URI prefix removed. */
  payload: string;
  /** MIME type from a `data:` URI prefix, if one was present. */
  mimeType: string | null;
};

/** Splits an optional `data:<mime>[;params];base64,` prefix off the pasted input. */
export function parseBase64Input(input: string): ParsedBase64Input {
  const trimmed = input.trim();
  const match = /^data:([^,;]*)((?:;[^,;]*)*?);base64,/i.exec(trimmed);

  if (!match) {
    return { payload: trimmed, mimeType: null };
  }

  return { payload: trimmed.slice(match[0].length), mimeType: match[1] ? match[1].toLowerCase() : null };
}

/**
 * "line 2, column 5" of the `compactIndex`-th non-whitespace character of `input`, so an error
 * points at where the character is in what the user typed, not in the whitespace-stripped copy.
 */
function locateInInput(input: string, compactIndex: number): string {
  let line = 1;
  let column = 0;
  let seen = -1;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];

    if (char === "\n" || (char === "\r" && input[index + 1] !== "\n")) {
      line += 1;
      column = 0;
      continue;
    }

    column += 1;

    if (!/\s/.test(char)) {
      seen += 1;
      if (seen === compactIndex) return `line ${line}, column ${column}`;
    }
  }

  return `line ${line}, column ${column}`;
}

/**
 * Decodes Base64 (standard or URL-safe alphabet, padded or unpadded, whitespace ignored) into
 * bytes. Throws `Base64Error` with a specific message for anything that isn't valid Base64
 * instead of returning partial output.
 */
export function base64ToBytes(input: string): Uint8Array {
  const compact = input.replace(/\s+/g, "");
  const unpadded = compact.replace(/={1,2}$/, "");

  if (/=/.test(unpadded)) {
    throw new Base64Error(
      `Padding characters (=) can only appear at the end of Base64 text (found one at ${locateInInput(input, unpadded.indexOf("="))}).`,
    );
  }

  const paddingLength = compact.length - unpadded.length;
  if (paddingLength > 0 && compact.length % 4 !== 0) {
    throw new Base64Error("Base64 text with padding must have a length that is a multiple of 4.");
  }

  for (let index = 0; index < unpadded.length; index += 1) {
    const code = unpadded.charCodeAt(index);
    if (code > 127 || decodeTable[code] === -1) {
      throw new Base64Error(
        `Invalid Base64 character "${unpadded[index]}" at ${locateInInput(input, index)}. Base64 only uses A–Z, a–z, 0–9, + and / (or - and _).`,
      );
    }
  }

  const remainder = unpadded.length % 4;
  if (remainder === 1) {
    throw new Base64Error("This Base64 text is truncated or has an extra character (its length is not valid).");
  }

  const outputLength = Math.floor((unpadded.length * 3) / 4);
  const bytes = new Uint8Array(outputLength);
  let outIndex = 0;

  for (let index = 0; index < unpadded.length; index += 4) {
    const a = decodeTable[unpadded.charCodeAt(index)];
    const b = decodeTable[unpadded.charCodeAt(index + 1)];
    const c = index + 2 < unpadded.length ? decodeTable[unpadded.charCodeAt(index + 2)] : -1;
    const d = index + 3 < unpadded.length ? decodeTable[unpadded.charCodeAt(index + 3)] : -1;

    bytes[outIndex++] = (a << 2) | (b >> 4);
    if (c !== -1) bytes[outIndex++] = ((b & 0x0f) << 4) | (c >> 2);
    if (d !== -1) bytes[outIndex++] = ((c & 0x03) << 6) | d;
  }

  return bytes;
}

export type DecodedText = { ok: true; text: string; mimeType: string | null } | { ok: false; error: string };

/** Decodes Base64 and interprets the bytes as UTF-8 text, reporting non-text data clearly. */
export function decodeBase64ToText(input: string): DecodedText {
  const parsed = parseBase64Input(input);

  try {
    const bytes = base64ToBytes(parsed.payload);
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return { ok: true, text, mimeType: parsed.mimeType };
  } catch (error) {
    if (error instanceof Base64Error) {
      return { ok: false, error: error.message };
    }

    return {
      ok: false,
      error: "The decoded bytes are not valid UTF-8 text. This is probably binary data — use the file option to download it instead.",
    };
  }
}

export function toDataUri(base64: string, mimeType: string): string {
  return `data:${mimeType || "application/octet-stream"};base64,${base64}`;
}

const extensionByMimeType: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "application/pdf": "pdf",
  "application/json": "json",
  "text/plain": "txt",
  "text/html": "html",
  "text/css": "css",
  "text/csv": "csv",
  "application/zip": "zip",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "video/mp4": "mp4",
};

/** File extension for a MIME type, or "bin" when it isn't one of the common types listed above. */
export function extensionForMimeType(mimeType: string | null): string {
  return (mimeType && extensionByMimeType[mimeType]) || "bin";
}
