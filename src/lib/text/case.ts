/**
 * Text case conversion. Pure functions over strings so every mode is unit testable.
 *
 * "Identifier" modes (camel, Pascal, snake, kebab, CONSTANT, dot, path) split each line into words
 * first — at separators, lower→upper boundaries, acronym boundaries and letter/digit boundaries —
 * and convert line by line so multi-line input keeps its line breaks.
 */

export type CaseMode =
  | "upper"
  | "lower"
  | "title"
  | "sentence"
  | "swap"
  | "alternating"
  | "camel"
  | "pascal"
  | "snake"
  | "kebab"
  | "constant"
  | "dot"
  | "path";

export const caseModes: Array<{ value: CaseMode; label: string; example: string }> = [
  { value: "upper", label: "UPPER CASE", example: "HELLO WORLD" },
  { value: "lower", label: "lower case", example: "hello world" },
  { value: "title", label: "Title Case", example: "Hello World" },
  { value: "sentence", label: "Sentence case", example: "Hello world." },
  { value: "swap", label: "Swap case", example: "hELLO wORLD" },
  { value: "alternating", label: "aLtErNaTiNg", example: "hElLo WoRlD" },
  { value: "camel", label: "camelCase", example: "helloWorld" },
  { value: "pascal", label: "PascalCase", example: "HelloWorld" },
  { value: "snake", label: "snake_case", example: "hello_world" },
  { value: "kebab", label: "kebab-case", example: "hello-world" },
  { value: "constant", label: "CONSTANT_CASE", example: "HELLO_WORLD" },
  { value: "dot", label: "dot.case", example: "hello.world" },
  { value: "path", label: "path/case", example: "hello/world" },
];

export type CaseOptions = {
  /** Title Case only: keep short words like "of" and "the" lowercase unless first or last. */
  keepSmallWordsLower?: boolean;
};

const smallWords = new Set([
  "a", "an", "and", "as", "at", "but", "by", "for", "from", "in", "nor", "of", "on", "or", "the", "to", "via", "with",
]);

// Alternation order matters: an acronym followed by a capitalised word ("XMLHttp") is split before
// the acronym swallows the capital that starts the next word.
const wordPattern = /\p{Lu}+(?=\p{Lu}[\p{Ll}\p{M}])|\p{Lu}?[\p{Ll}\p{M}]+|\p{Lu}+|\p{N}+|\p{Lo}+/gu;

/** Splits a string into words for identifier-style cases. Apostrophes inside words are dropped. */
export function splitWords(line: string): string[] {
  const withoutApostrophes = line.replace(/(?<=\p{L})['’](?=\p{L})/gu, "");
  return withoutApostrophes.match(wordPattern) ?? [];
}

function capitalize(word: string): string {
  const [first = "", ...rest] = Array.from(word);
  return first.toUpperCase() + rest.join("").toLowerCase();
}

function mapLines(text: string, convert: (line: string) => string): string {
  return text
    .split(/(\r\n|\r|\n)/)
    .map((part, index) => (index % 2 === 1 ? part : convert(part)))
    .join("");
}

function titleCase(text: string, keepSmallWordsLower: boolean): string {
  const tokens = Array.from(text.matchAll(/[\p{L}\p{M}\p{N}]+(?:['’][\p{L}\p{M}]+)*/gu));
  const lastIndex = tokens.length - 1;
  let result = "";
  let cursor = 0;

  tokens.forEach((token, index) => {
    const start = token.index ?? 0;
    result += text.slice(cursor, start);

    const lower = token[0].toLowerCase();
    const isEdge = index === 0 || index === lastIndex;
    result += keepSmallWordsLower && !isEdge && smallWords.has(lower) ? lower : capitalize(token[0]);
    cursor = start + token[0].length;
  });

  return result + text.slice(cursor);
}

function sentenceCase(text: string): string {
  const lower = text.toLowerCase();
  let capitalizeNext = true;
  let result = "";

  for (const char of lower) {
    if (capitalizeNext && /\p{L}/u.test(char)) {
      result += char.toUpperCase();
      capitalizeNext = false;
    } else {
      result += char;
      if (/[.!?\n\r]/.test(char)) capitalizeNext = true;
      else if (/[\p{L}\p{N}]/u.test(char)) capitalizeNext = false;
    }
  }

  return result;
}

function alternating(text: string): string {
  let letterIndex = 0;
  let result = "";

  for (const char of text) {
    if (/\p{L}/u.test(char)) {
      result += letterIndex % 2 === 0 ? char.toLowerCase() : char.toUpperCase();
      letterIndex += 1;
    } else {
      result += char;
    }
  }

  return result;
}

function swapCase(text: string): string {
  let result = "";

  for (const char of text) {
    const upper = char.toUpperCase();
    const lower = char.toLowerCase();
    result += char === upper && char !== lower ? lower : char === lower && char !== upper ? upper : char;
  }

  return result;
}

export function convertCase(text: string, mode: CaseMode, options: CaseOptions = {}): string {
  switch (mode) {
    case "upper":
      return text.toUpperCase();
    case "lower":
      return text.toLowerCase();
    case "title":
      return titleCase(text, options.keepSmallWordsLower ?? false);
    case "sentence":
      return sentenceCase(text);
    case "swap":
      return swapCase(text);
    case "alternating":
      return alternating(text);
    case "camel":
      return mapLines(text, (line) =>
        splitWords(line)
          .map((word, index) => (index === 0 ? word.toLowerCase() : capitalize(word)))
          .join(""),
      );
    case "pascal":
      return mapLines(text, (line) => splitWords(line).map(capitalize).join(""));
    case "snake":
      return mapLines(text, (line) => splitWords(line).map((word) => word.toLowerCase()).join("_"));
    case "kebab":
      return mapLines(text, (line) => splitWords(line).map((word) => word.toLowerCase()).join("-"));
    case "constant":
      return mapLines(text, (line) => splitWords(line).map((word) => word.toUpperCase()).join("_"));
    case "dot":
      return mapLines(text, (line) => splitWords(line).map((word) => word.toLowerCase()).join("."));
    case "path":
      return mapLines(text, (line) => splitWords(line).map((word) => word.toLowerCase()).join("/"));
  }
}
