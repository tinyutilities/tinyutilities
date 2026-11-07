/**
 * Color parsing and conversion between HEX, RGB, HSL, HSV and CMYK, plus WCAG contrast.
 *
 * All conversions are in the sRGB color space with the standard formulas. CMYK here is the simple
 * mathematical conversion from RGB — it is NOT an ICC/print-profile conversion, so printed output
 * can differ. CSS named colors (e.g. "tomato") are not parsed.
 */

export type Rgb = { r: number; g: number; b: number };
export type Rgba = Rgb & { a: number };
export type Hsl = { h: number; s: number; l: number };
export type Hsv = { h: number; s: number; v: number };
export type Cmyk = { c: number; m: number; y: number; k: number };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Rounds to `places` decimals and drops trailing zeros. */
export function roundTo(value: number, places = 0): number {
  const factor = 10 ** places;
  const rounded = Math.round((value + Number.EPSILON) * factor) / factor;
  return Object.is(rounded, -0) ? 0 : rounded;
}

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    if (max === red) h = ((green - blue) / delta) % 6;
    else if (max === green) h = (blue - red) / delta + 2;
    else h = (red - green) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  return { h, s: s * 100, l: l * 100 };
}

export function hslToRgb({ h, s, l }: Hsl): Rgb {
  const hue = ((h % 360) + 360) % 360;
  const saturation = clamp(s, 0, 100) / 100;
  const lightness = clamp(l, 0, 100) / 100;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = lightness - chroma / 2;
  const [r, g, b] =
    hue < 60 ? [chroma, x, 0] : hue < 120 ? [x, chroma, 0] : hue < 180 ? [0, chroma, x] : hue < 240 ? [0, x, chroma] : hue < 300 ? [x, 0, chroma] : [chroma, 0, x];

  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

export function rgbToHsv({ r, g, b }: Rgb): Hsv {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  const { h } = rgbToHsl({ r, g, b });

  return { h, s: max === 0 ? 0 : (delta / max) * 100, v: max * 100 };
}

export function hsvToRgb({ h, s, v }: Hsv): Rgb {
  const hue = ((h % 360) + 360) % 360;
  const saturation = clamp(s, 0, 100) / 100;
  const value = clamp(v, 0, 100) / 100;
  const chroma = value * saturation;
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = value - chroma;
  const [r, g, b] =
    hue < 60 ? [chroma, x, 0] : hue < 120 ? [x, chroma, 0] : hue < 180 ? [0, chroma, x] : hue < 240 ? [0, x, chroma] : hue < 300 ? [x, 0, chroma] : [chroma, 0, x];

  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

export function rgbToCmyk({ r, g, b }: Rgb): Cmyk {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const k = 1 - Math.max(red, green, blue);

  if (k >= 1) return { c: 0, m: 0, y: 0, k: 100 };

  return {
    c: ((1 - red - k) / (1 - k)) * 100,
    m: ((1 - green - k) / (1 - k)) * 100,
    y: ((1 - blue - k) / (1 - k)) * 100,
    k: k * 100,
  };
}

export function cmykToRgb({ c, m, y, k }: Cmyk): Rgb {
  const cyan = clamp(c, 0, 100) / 100;
  const magenta = clamp(m, 0, 100) / 100;
  const yellow = clamp(y, 0, 100) / 100;
  const black = clamp(k, 0, 100) / 100;

  return {
    r: 255 * (1 - cyan) * (1 - black),
    g: 255 * (1 - magenta) * (1 - black),
    b: 255 * (1 - yellow) * (1 - black),
  };
}

const toByte = (value: number) => clamp(Math.round(value), 0, 255);

export function rgbToHex({ r, g, b }: Rgb, alpha?: number): string {
  const parts = [toByte(r), toByte(g), toByte(b)];
  if (alpha !== undefined && alpha < 1) parts.push(toByte(alpha * 255));
  return `#${parts.map((part) => part.toString(16).padStart(2, "0")).join("")}`;
}

// ---------------------------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------------------------

export type ParseResult = { ok: true; color: Rgba } | { ok: false; error: string };

const number = "[+-]?(?:\\d+\\.?\\d*|\\.\\d+)";

function parseNumber(token: string): number {
  return Number.parseFloat(token);
}

/** A channel that is either 0–255 or a percentage. */
function parseChannel(token: string): number {
  return token.endsWith("%") ? (clamp(parseNumber(token), 0, 100) / 100) * 255 : clamp(parseNumber(token), 0, 255);
}

function parseAlpha(token: string | undefined): number {
  if (token === undefined) return 1;
  return token.endsWith("%") ? clamp(parseNumber(token) / 100, 0, 1) : clamp(parseNumber(token), 0, 1);
}

function parseHue(token: string): number {
  const value = parseNumber(token);
  if (/turn$/i.test(token)) return value * 360;
  if (/rad$/i.test(token)) return (value * 180) / Math.PI;
  if (/grad$/i.test(token)) return value * 0.9;
  return value;
}

const separator = "\\s*[,\\s]\\s*";
const alphaSeparator = "(?:\\s*[,/]\\s*|\\s+/\\s*)";

function functionArgs(input: string, names: string[]): string[] | null {
  const match = new RegExp(`^(${names.join("|")})\\(\\s*(.*?)\\s*\\)$`, "i").exec(input);
  return match ? [match[2]] : null;
}

export function parseColor(rawInput: string): ParseResult {
  const input = rawInput.trim();

  if (input === "") return { ok: false, error: "Enter a color value." };

  // HEX: #rgb, #rgba, #rrggbb, #rrggbbaa (the # is optional).
  const hexMatch = /^#?([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(input);
  if (hexMatch) {
    const digits = hexMatch[1].length <= 4 ? hexMatch[1].replace(/./g, "$&$&") : hexMatch[1];
    const hasAlpha = digits.length === 8;
    return {
      ok: true,
      color: {
        r: Number.parseInt(digits.slice(0, 2), 16),
        g: Number.parseInt(digits.slice(2, 4), 16),
        b: Number.parseInt(digits.slice(4, 6), 16),
        a: hasAlpha ? Number.parseInt(digits.slice(6, 8), 16) / 255 : 1,
      },
    };
  }

  const rgbArgs = functionArgs(input, ["rgb", "rgba"]);
  if (rgbArgs) {
    const pattern = new RegExp(
      `^(${number}%?)${separator}(${number}%?)${separator}(${number}%?)(?:${alphaSeparator}(${number}%?))?$`,
    );
    const match = pattern.exec(rgbArgs[0]);
    if (match) {
      return {
        ok: true,
        color: { r: parseChannel(match[1]), g: parseChannel(match[2]), b: parseChannel(match[3]), a: parseAlpha(match[4]) },
      };
    }
    return { ok: false, error: "Could not read that rgb() value. Try rgb(30, 144, 255) or rgb(30 144 255 / 50%)." };
  }

  const hslArgs = functionArgs(input, ["hsl", "hsla"]);
  if (hslArgs) {
    const pattern = new RegExp(
      `^(${number}(?:deg|rad|grad|turn)?)${separator}(${number})%?${separator}(${number})%?(?:${alphaSeparator}(${number}%?))?$`,
      "i",
    );
    const match = pattern.exec(hslArgs[0]);
    if (match) {
      const rgb = hslToRgb({ h: parseHue(match[1]), s: parseNumber(match[2]), l: parseNumber(match[3]) });
      return { ok: true, color: { ...rgb, a: parseAlpha(match[4]) } };
    }
    return { ok: false, error: "Could not read that hsl() value. Try hsl(210, 100%, 56%)." };
  }

  const hsvArgs = functionArgs(input, ["hsv", "hsb"]);
  if (hsvArgs) {
    const pattern = new RegExp(`^(${number}(?:deg)?)${separator}(${number})%?${separator}(${number})%?$`, "i");
    const match = pattern.exec(hsvArgs[0]);
    if (match) {
      return { ok: true, color: { ...hsvToRgb({ h: parseHue(match[1]), s: parseNumber(match[2]), v: parseNumber(match[3]) }), a: 1 } };
    }
    return { ok: false, error: "Could not read that hsv() value. Try hsv(210, 88%, 100%)." };
  }

  const cmykArgs = functionArgs(input, ["cmyk"]);
  if (cmykArgs) {
    const pattern = new RegExp(`^(${number})%?${separator}(${number})%?${separator}(${number})%?${separator}(${number})%?$`);
    const match = pattern.exec(cmykArgs[0]);
    if (match) {
      return {
        ok: true,
        color: {
          ...cmykToRgb({ c: parseNumber(match[1]), m: parseNumber(match[2]), y: parseNumber(match[3]), k: parseNumber(match[4]) }),
          a: 1,
        },
      };
    }
    return { ok: false, error: "Could not read that cmyk() value. Try cmyk(88, 44, 0, 0)." };
  }

  if (/^[a-z]+$/i.test(input)) {
    return { ok: false, error: "Named colors like \"tomato\" aren't supported. Enter a HEX, RGB, HSL, HSV or CMYK value." };
  }

  return { ok: false, error: "Could not recognise that color. Enter a HEX, RGB, HSL, HSV or CMYK value." };
}

// ---------------------------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------------------------

export type ColorFormats = {
  hex: string;
  rgb: string;
  hsl: string;
  hsv: string;
  cmyk: string;
  hasAlpha: boolean;
};

export function formatColor(color: Rgba, upperHex = false): ColorFormats {
  const rgb = { r: toByte(color.r), g: toByte(color.g), b: toByte(color.b) };
  const hsl = rgbToHsl(color);
  const hsv = rgbToHsv(color);
  const cmyk = rgbToCmyk(color);
  const hasAlpha = color.a < 1;
  const alpha = roundTo(color.a, 3);
  const hex = rgbToHex(color, color.a);

  return {
    hex: upperHex ? hex.toUpperCase() : hex,
    rgb: hasAlpha ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})` : `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
    hsl: hasAlpha
      ? `hsla(${roundTo(hsl.h, 1)}, ${roundTo(hsl.s, 1)}%, ${roundTo(hsl.l, 1)}%, ${alpha})`
      : `hsl(${roundTo(hsl.h, 1)}, ${roundTo(hsl.s, 1)}%, ${roundTo(hsl.l, 1)}%)`,
    hsv: `hsv(${roundTo(hsv.h, 1)}, ${roundTo(hsv.s, 1)}%, ${roundTo(hsv.v, 1)}%)`,
    cmyk: `cmyk(${roundTo(cmyk.c, 1)}%, ${roundTo(cmyk.m, 1)}%, ${roundTo(cmyk.y, 1)}%, ${roundTo(cmyk.k, 1)}%)`,
    hasAlpha,
  };
}

// ---------------------------------------------------------------------------------------------
// WCAG 2.x contrast
// ---------------------------------------------------------------------------------------------

function linearize(channel: number): number {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance({ r, g, b }: Rgb): number {
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

export function contrastRatio(a: Rgb, b: Rgb): number {
  const first = relativeLuminance(a);
  const second = relativeLuminance(b);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

export type ContrastReport = {
  ratio: number;
  aaNormal: boolean;
  aaLarge: boolean;
  aaaNormal: boolean;
  aaaLarge: boolean;
};

export function contrastReport(foreground: Rgb, background: Rgb): ContrastReport {
  const ratio = contrastRatio(foreground, background);
  return { ratio, aaNormal: ratio >= 4.5, aaLarge: ratio >= 3, aaaNormal: ratio >= 7, aaaLarge: ratio >= 4.5 };
}
