import { describe, expect, it } from "vitest";
import { bytesToBase64 } from "@/lib/base64/base64";
import { cleanTokenInput, decodeJwt, formatDuration } from "./decode";

const encode = (value: unknown) =>
  bytesToBase64(new TextEncoder().encode(typeof value === "string" ? value : JSON.stringify(value)), {
    urlSafe: true,
    padding: false,
  });

const makeToken = (header: unknown, payload: unknown, signature = "c2lnbmF0dXJl") =>
  `${encode(header)}.${encode(payload)}.${signature}`;

// The widely used example token from jwt.io (HS256, secret "your-256-bit-secret").
const jwtIoSample =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

const now = Date.UTC(2024, 0, 1, 12, 0, 0);
const nowSeconds = now / 1000;

describe("decodeJwt", () => {
  it("decodes the jwt.io sample token", () => {
    const result = decodeJwt(jwtIoSample, now);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.header).toEqual({ alg: "HS256", typ: "JWT" });
    expect(result.payload).toEqual({ sub: "1234567890", name: "John Doe", iat: 1516239022 });
    expect(result.algorithm).toBe("HS256");
    expect(result.signature).toBe("SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c");
    expect(result.timeClaims[0]).toMatchObject({ claim: "iat", iso: "2018-01-18T01:30:22.000Z", attention: false });
    expect(result.warnings).toEqual([]);
  });

  it("decodes UTF-8 payloads", () => {
    const result = decodeJwt(makeToken({ alg: "HS256" }, { name: "Zoë 世界 😀" }), now);
    expect(result.ok && result.payload).toEqual({ name: "Zoë 世界 😀" });
  });

  it("accepts a pasted Authorization header, quotes and line breaks", () => {
    const wrapped = `Authorization: Bearer ${jwtIoSample.slice(0, 40)}\n${jwtIoSample.slice(40)}`;
    expect(decodeJwt(wrapped, now).ok).toBe(true);
    expect(cleanTokenInput(`"${jwtIoSample}"`)).toBe(jwtIoSample);
  });

  it("never claims the signature was verified", () => {
    const tampered = jwtIoSample.replace(/\.[^.]+$/, ".AAAA");
    const result = decodeJwt(tampered, now);
    expect(result.ok).toBe(true);
    expect(JSON.stringify(result)).not.toMatch(/verified|valid signature/i);
  });
});

describe("time claims", () => {
  it("flags expired tokens", () => {
    const result = decodeJwt(makeToken({ alg: "HS256" }, { exp: nowSeconds - 3 * 3600 }), now);
    expect(result.ok && result.timeClaims[0]).toMatchObject({
      claim: "exp",
      status: "Expired 3 hours ago",
      attention: true,
    });
  });

  it("reports a token that is still valid", () => {
    const result = decodeJwt(makeToken({ alg: "HS256" }, { exp: nowSeconds + 2 * 86400 }), now);
    expect(result.ok && result.timeClaims[0]).toMatchObject({ status: "Expires in 2 days", attention: false });
  });

  it("treats exp equal to now as expired", () => {
    const result = decodeJwt(makeToken({ alg: "HS256" }, { exp: nowSeconds }), now);
    expect(result.ok && result.timeClaims[0].attention).toBe(true);
  });

  it("flags nbf in the future and iat in the future", () => {
    const result = decodeJwt(makeToken({ alg: "HS256" }, { nbf: nowSeconds + 60, iat: nowSeconds + 120 }), now);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.timeClaims.map((claim) => [claim.claim, claim.attention])).toEqual([
      ["iat", true],
      ["nbf", true],
    ]);
  });

  it("warns about non-numeric time claims instead of ignoring them", () => {
    const result = decodeJwt(makeToken({ alg: "HS256" }, { exp: "tomorrow" }), now);
    expect(result.ok && result.warnings[0]).toMatch(/"exp" claim should be a number/);
  });

  it("formats durations", () => {
    expect(formatDuration(1)).toBe("1 second");
    expect(formatDuration(90)).toBe("1 minute");
    expect(formatDuration(-7200)).toBe("2 hours");
    expect(formatDuration(86400 * 400)).toBe("1 year");
  });
});

describe("warnings", () => {
  it("warns about alg none", () => {
    const result = decodeJwt(makeToken({ alg: "none" }, { sub: "1" }, ""), now);
    expect(result.ok && result.warnings.join(" ")).toMatch(/unsigned/);
  });

  it("warns about a missing alg and an empty signature", () => {
    const missingAlg = decodeJwt(makeToken({ typ: "JWT" }, { sub: "1" }), now);
    expect(missingAlg.ok && missingAlg.warnings.join(" ")).toMatch(/no "alg"/);

    const noSignature = decodeJwt(makeToken({ alg: "HS256" }, { sub: "1" }, ""), now);
    expect(noSignature.ok && noSignature.warnings.join(" ")).toMatch(/signature part is empty/);
  });

  it("handles non-object payloads", () => {
    const result = decodeJwt(makeToken({ alg: "HS256" }, "just text"), now);
    expect(result.ok && result.payloadIsObject).toBe(false);
  });
});

describe("rejections", () => {
  it("rejects empty input", () => {
    expect(decodeJwt("  ", now)).toEqual({ ok: false, error: "Paste a JWT to decode it." });
  });

  it("rejects the wrong number of parts", () => {
    const result = decodeJwt("abc.def", now);
    expect(!result.ok && result.error).toMatch(/three dot-separated parts.*has 2/);
  });

  it("explains encrypted (JWE) tokens", () => {
    const result = decodeJwt("a.b.c.d.e", now);
    expect(!result.ok && result.error).toMatch(/encrypted/);
  });

  it("rejects invalid Base64URL, non-JSON and non-object headers", () => {
    expect(decodeJwt("!!!.e30.sig", now).ok).toBe(false);
    expect(decodeJwt(`${encode("not json")}.e30.sig`, now)).toMatchObject({ ok: false });
    const arrayHeader = decodeJwt(`${encode([1])}.e30.sig`, now);
    expect(!arrayHeader.ok && arrayHeader.error).toMatch(/not a JSON object/);
  });

  it("rejects an empty segment", () => {
    const result = decodeJwt(`.${encode({})}.sig`, now);
    expect(!result.ok && result.error).toMatch(/header part of this token is empty/);
  });
});
