/**
 * Line-oriented text cleaning and sorting. Pure functions so every option is unit testable.
 *
 * Pipeline order (fixed, and described on the page): trim → collapse spaces → remove empty lines →
 * remove duplicates (first occurrence kept) → sort / reverse.
 */

export type SortMode = "none" | "asc" | "desc" | "length-asc" | "length-desc" | "reverse";

export type LineOptions = {
  trimLines: boolean;
  collapseSpaces: boolean;
  removeEmpty: boolean;
  removeDuplicates: boolean;
  /** Treat "Apple" and "apple" as the same line when removing duplicates. */
  ignoreCaseForDuplicates: boolean;
  sort: SortMode;
  /** Sort numbers inside lines by value ("item2" before "item10"). */
  naturalSort: boolean;
  /** Ignore letter case when sorting alphabetically. */
  ignoreCaseForSort: boolean;
  /** BCP 47 locale for alphabetical sorting; undefined uses the browser's. Tests pin "en". */
  locale?: string;
};

export const defaultLineOptions: LineOptions = {
  trimLines: false,
  collapseSpaces: false,
  removeEmpty: false,
  removeDuplicates: false,
  ignoreCaseForDuplicates: false,
  sort: "none",
  naturalSort: false,
  ignoreCaseForSort: false,
};

export type LineStats = {
  inputLines: number;
  outputLines: number;
  emptyRemoved: number;
  duplicatesRemoved: number;
};

export type LineResult = { text: string; stats: LineStats };

function detectEol(text: string): string {
  if (text.includes("\r\n")) return "\r\n";
  if (text.includes("\n")) return "\n";
  if (text.includes("\r")) return "\r";
  return "\n";
}

export function processLines(text: string, options: LineOptions): LineResult {
  if (text === "") {
    return { text: "", stats: { inputLines: 0, outputLines: 0, emptyRemoved: 0, duplicatesRemoved: 0 } };
  }

  const eol = detectEol(text);
  const endsWithEol = /(\r\n|\r|\n)$/.test(text);
  const body = endsWithEol ? text.replace(/(\r\n|\r|\n)$/, "") : text;
  let lines = body.split(/\r\n|\r|\n/);
  const inputLines = lines.length;

  if (options.trimLines) lines = lines.map((line) => line.trim());
  if (options.collapseSpaces) lines = lines.map((line) => line.replace(/[ \t ]+/g, " "));

  let emptyRemoved = 0;
  if (options.removeEmpty) {
    const before = lines.length;
    lines = lines.filter((line) => line.trim() !== "");
    emptyRemoved = before - lines.length;
  }

  let duplicatesRemoved = 0;
  if (options.removeDuplicates) {
    const seen = new Set<string>();
    const before = lines.length;
    lines = lines.filter((line) => {
      const key = options.ignoreCaseForDuplicates ? line.toLowerCase() : line;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    duplicatesRemoved = before - lines.length;
  }

  if (options.sort !== "none") {
    const collator = new Intl.Collator(options.locale, {
      numeric: options.naturalSort,
      sensitivity: options.ignoreCaseForSort ? "accent" : "variant",
    });

    switch (options.sort) {
      case "asc":
        lines = [...lines].sort(collator.compare);
        break;
      case "desc":
        lines = [...lines].sort((a, b) => collator.compare(b, a));
        break;
      case "length-asc":
        lines = [...lines].sort((a, b) => Array.from(a).length - Array.from(b).length);
        break;
      case "length-desc":
        lines = [...lines].sort((a, b) => Array.from(b).length - Array.from(a).length);
        break;
      case "reverse":
        lines = [...lines].reverse();
        break;
    }
  }

  const output = lines.join(eol) + (endsWithEol && lines.length > 0 ? eol : "");

  return {
    text: output,
    stats: { inputLines, outputLines: lines.length, emptyRemoved, duplicatesRemoved },
  };
}
