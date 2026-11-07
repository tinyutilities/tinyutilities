import { createHash, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  algorithmsForChecksumLength,
  checksumsMatch,
  hashAlgorithms,
  hashBytes,
  hashBytesMany,
  hashText,
  normalizeChecksum,
  toHex,
} from "./hash";
import { md5 } from "./md5";

const ascii = (value: string) => new TextEncoder().encode(value);

describe("MD5 (RFC 1321 test suite)", () => {
  const vectors: Array<[string, string]> = [
    ["", "d41d8cd98f00b204e9800998ecf8427e"],
    ["a", "0cc175b9c0f1b6a831c399e269772661"],
    ["abc", "900150983cd24fb0d6963f7d28e17f72"],
    ["message digest", "f96b697d7cb7938d525a2f31aaf161d0"],
    ["abcdefghijklmnopqrstuvwxyz", "c3fcd3d76192e4007dfb496cca67e13b"],
    ["ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", "d174ab98d277d9f5a5611c2c9f419d9f"],
    [
      "12345678901234567890123456789012345678901234567890123456789012345678901234567890",
      "57edf4a22be3c955ac49da2e2107b67a",
    ],
  ];

  it.each(vectors)("hashes %j", (input, expected) => {
    expect(toHex(md5(ascii(input)))).toBe(expected);
  });

  it("matches Node's MD5 for every length around the 55/56/64-byte padding boundaries", () => {
    for (let length = 0; length <= 200; length += 1) {
      const data = new Uint8Array(randomBytes(length));
      expect(toHex(md5(data))).toBe(createHash("md5").update(data).digest("hex"));
    }
  });

  it("matches Node's MD5 for a one-million-byte input", () => {
    const data = new Uint8Array(1_000_000).fill(0x61);
    expect(toHex(md5(data))).toBe("7707d6ae4e027c70eea2a935c2296f21");
  });
});

describe("SHA family (NIST / FIPS 180 vectors)", () => {
  it("hashes the empty string", async () => {
    expect(await hashText("", "SHA-1")).toBe("da39a3ee5e6b4b0d3255bfef95601890afd80709");
    expect(await hashText("", "SHA-256")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });

  it("hashes 'abc'", async () => {
    expect(await hashText("abc", "SHA-1")).toBe("a9993e364706816aba3e25717850c26c9cd0d89d");
    expect(await hashText("abc", "SHA-256")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(await hashText("abc", "SHA-384")).toBe(
      "cb00753f45a35e8bb5a03d699ac65007272c32ab0eded1631a8b605a43ff5bed8086072ba1e7cc2358baeca134c825a7",
    );
    expect(await hashText("abc", "SHA-512")).toBe(
      "ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f",
    );
  });

  it("hashes the 448-bit two-block NIST message", async () => {
    expect(await hashText("abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq", "SHA-256")).toBe(
      "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1",
    );
  });

  it("hashes text as UTF-8", async () => {
    const text = "héllo wörld ✓ 😀";
    expect(await hashText(text, "SHA-256")).toBe(createHash("sha256").update(text, "utf8").digest("hex"));
    expect(await hashText(text, "MD5")).toBe(createHash("md5").update(text, "utf8").digest("hex"));
  });

  it("agrees with Node for binary data under every algorithm", async () => {
    const data = new Uint8Array(randomBytes(5000));
    const results = await hashBytesMany(data);

    for (const { value } of hashAlgorithms) {
      const nodeName = value.replace("-", "").toLowerCase();
      expect(results[value]).toBe(createHash(nodeName).update(data).digest("hex"));
    }
  });

  it("returns lowercase hex of the right length", async () => {
    for (const { value, bits } of hashAlgorithms) {
      const digest = await hashBytes(ascii("x"), value);
      expect(digest).toMatch(/^[0-9a-f]+$/);
      expect(digest).toHaveLength(bits / 4);
    }
  });
});

describe("checksum comparison helpers", () => {
  const sha256Abc = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";

  it("normalises pasted checksums", () => {
    expect(normalizeChecksum("  BA7816BF 8F01CFEA  ")).toBe("ba7816bf8f01cfea");
    expect(normalizeChecksum("sha256: BA78:16BF")).toBe("ba7816bf");
    expect(normalizeChecksum("SHA256=ba78")).toBe("ba78");
  });

  it("matches ignoring case, spacing and prefixes, but never an empty value", () => {
    expect(checksumsMatch(` SHA256:${sha256Abc.toUpperCase()} `, sha256Abc)).toBe(true);
    expect(checksumsMatch(sha256Abc.slice(0, -1) + "0", sha256Abc)).toBe(false);
    expect(checksumsMatch("   ", sha256Abc)).toBe(false);
  });

  it("suggests algorithms from digest length", () => {
    expect(algorithmsForChecksumLength(32)).toEqual(["MD5"]);
    expect(algorithmsForChecksumLength(64)).toEqual(["SHA-256"]);
    expect(algorithmsForChecksumLength(10)).toEqual([]);
  });
});
