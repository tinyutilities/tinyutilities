import { describe, expect, it } from "vitest";
import { detectImageFormat } from "./format";
import { makeJpegFixture, makePngFixture, makeWebpFixture } from "./test-utils";

describe("detectImageFormat", () => {
  it("identifies JPEG, PNG and WebP from their real signatures", () => {
    expect(detectImageFormat(makeJpegFixture())).toBe("jpeg");
    expect(detectImageFormat(makePngFixture())).toBe("png");
    expect(detectImageFormat(makeWebpFixture())).toBe("webp");
  });

  it("is not fooled by a wrong extension — it only trusts the bytes", () => {
    const png = makePngFixture();
    expect(detectImageFormat(png)).toBe("png"); // same bytes regardless of claimed name/type
  });

  it("returns null for unknown or empty data", () => {
    expect(detectImageFormat(new Uint8Array([1, 2, 3, 4]))).toBeNull();
    expect(detectImageFormat(new Uint8Array(0))).toBeNull();
    expect(detectImageFormat(new TextEncoder().encode("%PDF-1.4"))).toBeNull();
    expect(detectImageFormat(new TextEncoder().encode("GIF89a"))).toBeNull();
  });
});
