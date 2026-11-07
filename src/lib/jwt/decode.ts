import { base64ToBytes, Base64Error } from "@/lib/base64/base64";

/**
 * JWT decoding. This reads the header and payload of a JSON Web Token; it does NOT verify the
 * signature, check the issuer or audience, or establish that the token can be trusted. Anyone can
 * create a token with any contents, so decoded claims must never be treated as proof of identity.
 */

export type JwtTimeClaim = {
  claim: "exp" | "nbf" | "iat";
  label: string;
  seconds: number;
  iso: string;
  /** Plain-language status relative to `now`, e.g. "Expired 3 hours ago". */
  status: string;
  /** Marks a state worth flagging: an expired token, a not-yet-valid token, or an issue time in the future. */
  attention: boolean;
};

export type JwtDecoded = {
  ok: true;
  header: Record<string, unknown>;
  payload: unknown;
  payloadIsObject: boolean;
  signature: string;
  algorithm: string | null;
  timeClaims: JwtTimeClaim[];
  warnings: string[];
};

export type JwtResult = JwtDecoded | { ok: false; error: string };

function decodeSegmentToJson(segment: string, name: string): unknown {
  if (segment === "") {
    throw new Error(`The ${name} part of this token is empty.`);
  }

  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(base64ToBytes(segment));
  } catch (error) {
    if (error instanceof Base64Error) {
      throw new Error(`The ${name} is not valid Base64URL: ${error.message}`);
    }
    throw new Error(`The ${name} did not decode to valid UTF-8 text.`);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`The ${name} decoded to text that is not valid JSON.`);
  }
}

function plural(value: number, unit: string) {
  return `${value} ${unit}${value === 1 ? "" : "s"}`;
}

/** "3 hours", "2 days" — the largest sensible unit, rounded down. */
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.floor(Math.abs(totalSeconds));
  if (seconds < 60) return plural(seconds, "second");
  if (seconds < 3600) return plural(Math.floor(seconds / 60), "minute");
  if (seconds < 86400) return plural(Math.floor(seconds / 3600), "hour");
  if (seconds < 86400 * 365) return plural(Math.floor(seconds / 86400), "day");
  return plural(Math.floor(seconds / (86400 * 365)), "year");
}

function describeTimeClaim(claim: JwtTimeClaim["claim"], seconds: number, nowSeconds: number): JwtTimeClaim | null {
  const date = new Date(seconds * 1000);
  if (Number.isNaN(date.getTime())) return null;

  const difference = seconds - nowSeconds; // positive = in the future
  const relative = difference >= 0 ? `in ${formatDuration(difference)}` : `${formatDuration(difference)} ago`;

  if (claim === "exp") {
    const expired = nowSeconds >= seconds;
    return {
      claim,
      label: "Expires (exp)",
      seconds,
      iso: date.toISOString(),
      status: expired ? `Expired ${relative}` : `Expires ${relative}`,
      attention: expired,
    };
  }

  if (claim === "nbf") {
    const notYet = nowSeconds < seconds;
    return {
      claim,
      label: "Not valid before (nbf)",
      seconds,
      iso: date.toISOString(),
      status: notYet ? `Not valid yet — becomes valid ${relative}` : `Became valid ${relative}`,
      attention: notYet,
    };
  }

  const inFuture = seconds > nowSeconds;
  return {
    claim,
    label: "Issued at (iat)",
    seconds,
    iso: date.toISOString(),
    status: inFuture ? `Issued ${relative} (in the future)` : `Issued ${relative}`,
    attention: inFuture,
  };
}

/** Strips whitespace, wrapping quotes and a leading "Bearer " so a pasted Authorization header works. */
export function cleanTokenInput(input: string): string {
  return input
    .trim()
    .replace(/^authorization\s*:\s*/i, "")
    .replace(/^bearer\s+/i, "")
    .replace(/^["']|["']$/g, "")
    .replace(/\s+/g, "");
}

export function decodeJwt(input: string, nowMs: number = Date.now()): JwtResult {
  const token = cleanTokenInput(input);

  if (token === "") {
    return { ok: false, error: "Paste a JWT to decode it." };
  }

  const parts = token.split(".");

  if (parts.length === 5) {
    return {
      ok: false,
      error:
        "This looks like an encrypted token (JWE, five parts). Its contents are encrypted, so they can't be read without the decryption key.",
    };
  }

  if (parts.length !== 3) {
    return {
      ok: false,
      error: `A JWT has three dot-separated parts (header.payload.signature), but this has ${parts.length}.`,
    };
  }

  const [headerPart, payloadPart, signature] = parts;
  let header: unknown;
  let payload: unknown;

  try {
    header = decodeSegmentToJson(headerPart, "header");
    payload = decodeSegmentToJson(payloadPart, "payload");
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not decode this token." };
  }

  if (typeof header !== "object" || header === null || Array.isArray(header)) {
    return { ok: false, error: "The header is valid JSON but not a JSON object, so this is not a standard JWT." };
  }

  const headerRecord = header as Record<string, unknown>;
  const payloadIsObject = typeof payload === "object" && payload !== null && !Array.isArray(payload);
  const algorithm = typeof headerRecord.alg === "string" ? headerRecord.alg : null;
  const warnings: string[] = [];

  if (algorithm === null) {
    warnings.push("The header has no \"alg\" value, so the signing algorithm is unknown.");
  } else if (algorithm.toLowerCase() === "none") {
    warnings.push("This token uses alg \"none\": it is unsigned, so nothing about it is protected from tampering.");
  }

  if (signature === "" && algorithm?.toLowerCase() !== "none") {
    warnings.push("The signature part is empty even though the header declares a signing algorithm.");
  }

  if (!payloadIsObject) {
    warnings.push("The payload is not a JSON object, so it has no standard claims.");
  }

  const nowSeconds = nowMs / 1000;
  const timeClaims: JwtTimeClaim[] = [];

  if (payloadIsObject) {
    const claims = payload as Record<string, unknown>;

    for (const claim of ["iat", "nbf", "exp"] as const) {
      const value = claims[claim];
      if (value === undefined) continue;

      if (typeof value !== "number" || !Number.isFinite(value)) {
        warnings.push(`The "${claim}" claim should be a number of seconds since 1970, but it is not.`);
        continue;
      }

      const described = describeTimeClaim(claim, value, nowSeconds);
      if (described) timeClaims.push(described);
      else warnings.push(`The "${claim}" claim is outside the range of valid dates.`);
    }
  }

  return { ok: true, header: headerRecord, payload, payloadIsObject, signature, algorithm, timeClaims, warnings };
}
