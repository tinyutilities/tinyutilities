// Characters in the Windows-1252 range 0x80–0x9F that the standard PDF fonts (WinAnsiEncoding) can draw.
const winAnsiExtras = new Set("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ");

/**
 * Returns the first character that the built-in PDF fonts (Helvetica and friends) cannot draw,
 * or null if the text is fully supported. Those fonts only cover Western European text; drawing
 * anything else would throw, so tools check first and explain instead.
 */
export function findUnsupportedStandardFontCharacter(text: string): string | null {
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    const supported = (code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff) || winAnsiExtras.has(char);
    if (!supported) return char;
  }

  return null;
}

/** Parses "#rgb" / "#rrggbb" into 0–1 channels, or null if invalid. */
export function parseHexColor(value: string): { r: number; g: number; b: number } | null {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim());
  if (!match) return null;

  const digits = match[1].length === 3 ? match[1].replace(/./g, "$&$&") : match[1];
  return {
    r: Number.parseInt(digits.slice(0, 2), 16) / 255,
    g: Number.parseInt(digits.slice(2, 4), 16) / 255,
    b: Number.parseInt(digits.slice(4, 6), 16) / 255,
  };
}
