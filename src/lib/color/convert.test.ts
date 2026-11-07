import { describe, expect, it } from "vitest";
import {
  cmykToRgb,
  contrastRatio,
  contrastReport,
  formatColor,
  hslToRgb,
  hsvToRgb,
  parseColor,
  relativeLuminance,
  rgbToCmyk,
  rgbToHex,
  rgbToHsl,
  rgbToHsv,
  roundTo,
} from "./convert";

const parsed = (input: string) => {
  const result = parseColor(input);
  if (!result.ok) throw new Error(result.error);
  return result.color;
};

describe("RGB ↔ HSL", () => {
  it.each([
    [{ r: 255, g: 0, b: 0 }, { h: 0, s: 100, l: 50 }],
    [{ r: 0, g: 255, b: 0 }, { h: 120, s: 100, l: 50 }],
    [{ r: 0, g: 0, b: 255 }, { h: 240, s: 100, l: 50 }],
    [{ r: 255, g: 255, b: 255 }, { h: 0, s: 0, l: 100 }],
    [{ r: 0, g: 0, b: 0 }, { h: 0, s: 0, l: 0 }],
    [{ r: 128, g: 128, b: 128 }, { h: 0, s: 0, l: 50.196 }],
    [{ r: 102, g: 51, b: 153 }, { h: 270, s: 50, l: 40 }], // rebeccapurple
    [{ r: 30, g: 144, b: 255 }, { h: 209.6, s: 100, l: 55.882 }], // dodgerblue
  ])("converts %j", (rgb, expected) => {
    const hsl = rgbToHsl(rgb);
    expect(hsl.h).toBeCloseTo(expected.h, 0);
    expect(hsl.s).toBeCloseTo(expected.s, 1);
    expect(hsl.l).toBeCloseTo(expected.l, 1);
  });

  it("round-trips every 17th RGB value", () => {
    for (let r = 0; r < 256; r += 17) {
      for (let g = 0; g < 256; g += 17) {
        for (let b = 0; b < 256; b += 17) {
          const back = hslToRgb(rgbToHsl({ r, g, b }));
          expect(Math.round(back.r)).toBe(r);
          expect(Math.round(back.g)).toBe(g);
          expect(Math.round(back.b)).toBe(b);
        }
      }
    }
  });

  it("normalises hues outside 0–360", () => {
    expect(hslToRgb({ h: 480, s: 100, l: 50 })).toEqual(hslToRgb({ h: 120, s: 100, l: 50 }));
    expect(hslToRgb({ h: -120, s: 100, l: 50 })).toEqual(hslToRgb({ h: 240, s: 100, l: 50 }));
  });
});

describe("RGB ↔ HSV", () => {
  it("converts rebeccapurple", () => {
    const hsv = rgbToHsv({ r: 102, g: 51, b: 153 });
    expect(hsv.h).toBeCloseTo(270, 5);
    expect(hsv.s).toBeCloseTo(66.667, 2);
    expect(hsv.v).toBeCloseTo(60, 5);
  });

  it("handles black and round-trips", () => {
    expect(rgbToHsv({ r: 0, g: 0, b: 0 })).toEqual({ h: 0, s: 0, v: 0 });
    const back = hsvToRgb(rgbToHsv({ r: 12, g: 200, b: 99 }));
    expect([Math.round(back.r), Math.round(back.g), Math.round(back.b)]).toEqual([12, 200, 99]);
  });
});

describe("RGB ↔ CMYK", () => {
  it("converts rebeccapurple", () => {
    const cmyk = rgbToCmyk({ r: 102, g: 51, b: 153 });
    expect(cmyk.c).toBeCloseTo(33.333, 2);
    expect(cmyk.m).toBeCloseTo(66.667, 2);
    expect(cmyk.y).toBeCloseTo(0, 5);
    expect(cmyk.k).toBeCloseTo(40, 5);
  });

  it("handles pure black without dividing by zero", () => {
    expect(rgbToCmyk({ r: 0, g: 0, b: 0 })).toEqual({ c: 0, m: 0, y: 0, k: 100 });
    expect(cmykToRgb({ c: 0, m: 0, y: 0, k: 100 })).toEqual({ r: 0, g: 0, b: 0 });
  });

  it("round-trips", () => {
    const back = cmykToRgb(rgbToCmyk({ r: 200, g: 100, b: 50 }));
    expect([Math.round(back.r), Math.round(back.g), Math.round(back.b)]).toEqual([200, 100, 50]);
  });
});

describe("HEX", () => {
  it("formats with and without alpha", () => {
    expect(rgbToHex({ r: 30, g: 144, b: 255 })).toBe("#1e90ff");
    expect(rgbToHex({ r: 255, g: 0, b: 0 }, 0.5)).toBe("#ff000080");
    expect(rgbToHex({ r: 300, g: -5, b: 0.4 })).toBe("#ff0000");
  });
});

describe("parseColor", () => {
  it.each([
    ["#1E90FF", { r: 30, g: 144, b: 255, a: 1 }],
    ["1e90ff", { r: 30, g: 144, b: 255, a: 1 }],
    ["#fff", { r: 255, g: 255, b: 255, a: 1 }],
    ["#f00", { r: 255, g: 0, b: 0, a: 1 }],
    ["rgb(30, 144, 255)", { r: 30, g: 144, b: 255, a: 1 }],
    ["rgb(30 144 255)", { r: 30, g: 144, b: 255, a: 1 }],
    ["rgb(100%, 0%, 0%)", { r: 255, g: 0, b: 0, a: 1 }],
    ["  RGB( 0 , 0 , 0 )  ", { r: 0, g: 0, b: 0, a: 1 }],
  ])("parses %j", (input, expected) => {
    expect(parsed(input)).toMatchObject(expected);
  });

  it("parses alpha in every supported notation", () => {
    expect(parsed("#ff000080").a).toBeCloseTo(128 / 255, 5);
    expect(parsed("#f008").a).toBeCloseTo(136 / 255, 5);
    expect(parsed("rgba(1, 2, 3, 0.5)").a).toBe(0.5);
    expect(parsed("rgb(1 2 3 / 25%)").a).toBe(0.25);
    expect(parsed("hsla(120, 100%, 50%, 0.3)").a).toBe(0.3);
  });

  it("parses hsl, hsv and cmyk", () => {
    const hsl = parsed("hsl(270, 50%, 40%)");
    expect([Math.round(hsl.r), Math.round(hsl.g), Math.round(hsl.b)]).toEqual([102, 51, 153]);
    const hslTurn = parsed("hsl(0.5turn 100% 50%)");
    expect([Math.round(hslTurn.r), Math.round(hslTurn.g), Math.round(hslTurn.b)]).toEqual([0, 255, 255]);
    const hsv = parsed("hsv(270, 66.667%, 60%)");
    expect([Math.round(hsv.r), Math.round(hsv.g), Math.round(hsv.b)]).toEqual([102, 51, 153]);
    const cmyk = parsed("cmyk(33.333%, 66.667%, 0%, 40%)");
    expect([Math.round(cmyk.r), Math.round(cmyk.g), Math.round(cmyk.b)]).toEqual([102, 51, 153]);
  });

  it("clamps out-of-range channels", () => {
    expect(parsed("rgb(300, -10, 0)")).toMatchObject({ r: 255, g: 0, b: 0 });
  });

  it("gives specific errors", () => {
    expect(parseColor("")).toEqual({ ok: false, error: "Enter a color value." });
    expect(parseColor("tomato")).toMatchObject({ ok: false, error: expect.stringContaining("Named colors") });
    expect(parseColor("rgb(1, 2)")).toMatchObject({ ok: false, error: expect.stringContaining("rgb()") });
    expect(parseColor("hsl(a, b, c)")).toMatchObject({ ok: false, error: expect.stringContaining("hsl()") });
    expect(parseColor("#12345")).toMatchObject({ ok: false });
    expect(parseColor("#gggggg")).toMatchObject({ ok: false });
  });
});

describe("formatColor", () => {
  it("formats an opaque color in every notation", () => {
    expect(formatColor(parsed("#663399"))).toEqual({
      hex: "#663399",
      rgb: "rgb(102, 51, 153)",
      hsl: "hsl(270, 50%, 40%)",
      hsv: "hsv(270, 66.7%, 60%)",
      cmyk: "cmyk(33.3%, 66.7%, 0%, 40%)",
      hasAlpha: false,
    });
  });

  it("includes alpha when the color is translucent and supports upper-case HEX", () => {
    const formats = formatColor(parsed("rgba(255, 0, 0, 0.5)"), true);
    expect(formats.hex).toBe("#FF000080");
    expect(formats.rgb).toBe("rgba(255, 0, 0, 0.5)");
    expect(formats.hsl).toBe("hsla(0, 100%, 50%, 0.5)");
    expect(formats.hasAlpha).toBe(true);
  });

  it("round-trips through HEX → format → parse", () => {
    for (const hex of ["#1e90ff", "#000000", "#ffffff", "#7f7f7f", "#ff00aa"]) {
      expect(rgbToHex(parsed(formatColor(parsed(hex)).rgb))).toBe(hex);
      expect(rgbToHex(parsed(formatColor(parsed(hex)).hsl))).toBe(hex);
    }
  });

  it("rounds without producing negative zero", () => {
    expect(roundTo(-0.0001, 1)).toBe(0);
    expect(Object.is(roundTo(-0.0001, 1), 0)).toBe(true);
  });
});

describe("WCAG contrast", () => {
  const black = { r: 0, g: 0, b: 0 };
  const white = { r: 255, g: 255, b: 255 };

  it("matches the defined extremes", () => {
    expect(relativeLuminance(white)).toBeCloseTo(1, 10);
    expect(relativeLuminance(black)).toBe(0);
    expect(contrastRatio(black, white)).toBeCloseTo(21, 10);
    expect(contrastRatio(white, white)).toBeCloseTo(1, 10);
  });

  it("matches the known ratio for #767676 on white (the lightest gray that passes AA)", () => {
    expect(contrastRatio({ r: 0x76, g: 0x76, b: 0x76 }, white)).toBeCloseTo(4.54, 2);
    expect(contrastReport({ r: 0x76, g: 0x76, b: 0x76 }, white)).toMatchObject({ aaNormal: true, aaaNormal: false, aaLarge: true });
    expect(contrastReport({ r: 0x77, g: 0x77, b: 0x77 }, white).aaNormal).toBe(false);
  });
});
