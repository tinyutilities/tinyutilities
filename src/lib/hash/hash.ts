import { md5 } from "./md5";

export type HashAlgorithm = "MD5" | "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512";

export const hashAlgorithms: Array<{ value: HashAlgorithm; label: string; bits: number; weak: boolean }> = [
  { value: "MD5", label: "MD5", bits: 128, weak: true },
  { value: "SHA-1", label: "SHA-1", bits: 160, weak: true },
  { value: "SHA-256", label: "SHA-256", bits: 256, weak: false },
  { value: "SHA-384", label: "SHA-384", bits: 384, weak: false },
  { value: "SHA-512", label: "SHA-512", bits: 512, weak: false },
];

/** Largest file the file mode will hash. Web Crypto digests need the whole file in memory. */
export const maxHashFileBytes = 256 * 1024 * 1024;

export function toHex(bytes: Uint8Array): string {
  let hex = "";
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, "0");
  }
  return hex;
}

/** Hex digest of `data`. SHA family via Web Crypto (SubtleCrypto); MD5 via the local implementation. */
export async function hashBytes(data: Uint8Array, algorithm: HashAlgorithm): Promise<string> {
  if (algorithm === "MD5") {
    return toHex(md5(data));
  }

  // The cast narrows Uint8Array's buffer type for TypeScript; SubtleCrypto reads the bytes as-is.
  const digest = await crypto.subtle.digest(algorithm, data as Uint8Array<ArrayBuffer>);
  return toHex(new Uint8Array(digest));
}

export async function hashText(text: string, algorithm: HashAlgorithm): Promise<string> {
  return hashBytes(new TextEncoder().encode(text), algorithm);
}

/** Digests of the same bytes under several algorithms, keyed by algorithm. */
export async function hashBytesMany(
  data: Uint8Array,
  algorithms: HashAlgorithm[] = hashAlgorithms.map((entry) => entry.value),
): Promise<Record<HashAlgorithm, string>> {
  // One at a time: hashing a large file under all five algorithms in parallel would multiply peak memory.
  const results: Partial<Record<HashAlgorithm, string>> = {};
  for (const algorithm of algorithms) {
    results[algorithm] = await hashBytes(data, algorithm);
  }
  return results as Record<HashAlgorithm, string>;
}

/** Normalises a pasted checksum: strips whitespace, a "sha256:"-style prefix and colons, lowercases it. */
export function normalizeChecksum(value: string): string {
  return value
    .trim()
    .replace(/^[a-z0-9-]+\s*[:=]\s*/i, "")
    .replace(/[\s:]/g, "")
    .toLowerCase();
}

export function checksumsMatch(expected: string, actual: string): boolean {
  const normalized = normalizeChecksum(expected);
  return normalized.length > 0 && normalized === actual.toLowerCase();
}

/** Which algorithm a hex checksum of this length could belong to (by digest size). */
export function algorithmsForChecksumLength(hexLength: number): HashAlgorithm[] {
  return hashAlgorithms.filter((entry) => entry.bits / 4 === hexLength).map((entry) => entry.value);
}
