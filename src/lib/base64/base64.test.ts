import { describe, expect, it } from "vitest";
import {
  base64ToBytes,
  Base64Error,
  bytesToBase64,
  decodeBase64ToText,
  encodeTextToBase64,
  extensionForMimeType,
  parseBase64Input,
  toDataUri,
} from "./base64";

const text = (value: string) => new TextEncoder().encode(value);

describe("RFC 4648 section 10 test vectors", () => {
  const vectors: Array<[string, string]> = [
    ["", ""],
    ["f", "Zg=="],
    ["fo", "Zm8="],
    ["foo", "Zm9v"],
    ["foob", "Zm9vYg=="],
    ["fooba", "Zm9vYmE="],
    ["foobar", "Zm9vYmFy"],
  ];

  it.each(vectors)("encodes %j", (plain, encoded) => {
    expect(bytesToBase64(text(plain))).toBe(encoded);
  });

  it.each(vectors)("decodes %j", (plain, encoded) => {
    expect(new TextDecoder().decode(base64ToBytes(encoded))).toBe(plain);
  });
});

describe("UTF-8 handling", () => {
  it("encodes non-ASCII text as UTF-8 bytes", () => {
    expect(encodeTextToBase64("héllo")).toBe("aMOpbGxv");
    expect(encodeTextToBase64("✓")).toBe("4pyT");
    expect(encodeTextToBase64("😀")).toBe("8J+YgA==");
  });

  it("round-trips Unicode text", () => {
    const original = "Grüße, 世界! 😀 — naïve café";
    const decoded = decodeBase64ToText(encodeTextToBase64(original));
    expect(decoded).toEqual({ ok: true, text: original, mimeType: null });
  });
});

describe("options", () => {
  const bytes = new Uint8Array([0xfb, 0xff, 0xbf]);

  it("uses the URL-safe alphabet when asked", () => {
    expect(bytesToBase64(bytes)).toBe("+/+/");
    expect(bytesToBase64(bytes, { urlSafe: true })).toBe("-_-_");
  });

  it("can omit padding", () => {
    expect(bytesToBase64(text("f"), { padding: false })).toBe("Zg");
    expect(bytesToBase64(text("fo"), { padding: false })).toBe("Zm8");
  });

  it("wraps lines at the requested length", () => {
    const encoded = bytesToBase64(text("foobarfoobar"), { lineLength: 8 });
    expect(encoded).toBe("Zm9vYmFy\nZm9vYmFy");
  });

  it("handles inputs larger than one internal chunk", () => {
    const big = new Uint8Array(50_000).map((_, index) => index % 251);
    expect(Array.from(base64ToBytes(bytesToBase64(big)))).toEqual(Array.from(big));
  });
});

describe("decoding leniency and strictness", () => {
  it("accepts both alphabets, missing padding and whitespace", () => {
    expect(Array.from(base64ToBytes("-_-_"))).toEqual([0xfb, 0xff, 0xbf]);
    expect(Array.from(base64ToBytes("+/+/"))).toEqual([0xfb, 0xff, 0xbf]);
    expect(new TextDecoder().decode(base64ToBytes("Zm9v\r\nYmE"))).toBe("fooba");
  });

  it("rejects invalid characters with their line and column in the original text", () => {
    expect(() => base64ToBytes("Zm9v!mFy")).toThrow(/"!" at line 1, column 5/);
  });

  it("reports positions in the text as typed, not in a whitespace-stripped copy", () => {
    expect(() => base64ToBytes("Zm9v\nYmFy\n  Zm!v")).toThrow(/"!" at line 3, column 5/);
    expect(() => base64ToBytes("Zm9v YmFy\r\nZm9v YmF?")).toThrow(/"\?" at line 2, column 9/);
    expect(() => base64ToBytes("Zm9v\n\n\nZg==Zg==")).toThrow(/found one at line 4, column 3/);
  });

  it("rejects impossible lengths", () => {
    expect(() => base64ToBytes("Zm9vY")).toThrow(Base64Error);
  });

  it("rejects padding in the middle and mis-sized padded input", () => {
    expect(() => base64ToBytes("Zg==Zg==")).toThrow(/only appear at the end/);
    expect(() => base64ToBytes("Zm8==")).toThrow(/multiple of 4/);
  });

  it("reports binary data instead of garbling it", () => {
    const result = decodeBase64ToText(bytesToBase64(new Uint8Array([0xff, 0xfe, 0x00, 0x80])));
    expect(result.ok).toBe(false);
  });
});

describe("data URIs", () => {
  it("parses and builds data URIs", () => {
    expect(parseBase64Input("data:image/png;base64,iVBORw0KGgo=")).toEqual({
      payload: "iVBORw0KGgo=",
      mimeType: "image/png",
    });
    expect(parseBase64Input("  plain  ")).toEqual({ payload: "plain", mimeType: null });
    expect(parseBase64Input("data:text/plain;charset=utf-8;base64,Zm9v").mimeType).toBe("text/plain");
    expect(toDataUri("Zm9v", "text/plain")).toBe("data:text/plain;base64,Zm9v");
    expect(toDataUri("Zm9v", "")).toBe("data:application/octet-stream;base64,Zm9v");
  });

  it("decodes a data URI to its text", () => {
    expect(decodeBase64ToText("data:text/plain;base64,Zm9vYmFy")).toEqual({
      ok: true,
      text: "foobar",
      mimeType: "text/plain",
    });
  });

  it("maps MIME types to extensions", () => {
    expect(extensionForMimeType("image/png")).toBe("png");
    expect(extensionForMimeType("application/x-unknown")).toBe("bin");
    expect(extensionForMimeType(null)).toBe("bin");
  });
});
