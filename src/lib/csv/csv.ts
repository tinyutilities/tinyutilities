/**
 * CSV parsing and serialisation following RFC 4180: quoted fields, "" as an escaped quote,
 * delimiters and line breaks inside quotes, CRLF / LF / CR line endings. Pure and dependency-free.
 */

export type Delimiter = "," | ";" | "\t" | "|";

export const delimiterLabels: Array<{ value: Delimiter; label: string }> = [
  { value: ",", label: "Comma (,)" },
  { value: ";", label: "Semicolon (;)" },
  { value: "\t", label: "Tab" },
  { value: "|", label: "Pipe (|)" },
];

export class CsvParseError extends Error {
  constructor(
    message: string,
    readonly line: number,
  ) {
    super(message);
  }
}

export type ParsedCsv = {
  rows: string[][];
  /** Number of completely blank lines that were skipped. */
  blankLinesSkipped: number;
};

export function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/**
 * Guesses the delimiter from the first non-empty line, counting candidates outside quotes.
 * Falls back to a comma when nothing is clearly better.
 */
export function detectDelimiter(text: string): Delimiter {
  const source = stripBom(text);
  const candidates: Delimiter[] = [",", ";", "\t", "|"];
  const counts = new Map<Delimiter, number>(candidates.map((candidate) => [candidate, 0]));
  let inQuotes = false;
  let sawContent = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];

    if (char === '"') {
      inQuotes = !inQuotes;
      sawContent = true;
    } else if (!inQuotes && (char === "\n" || char === "\r")) {
      if (sawContent) break;
    } else if (!inQuotes) {
      sawContent = true;
      if (counts.has(char as Delimiter)) counts.set(char as Delimiter, (counts.get(char as Delimiter) ?? 0) + 1);
    } else {
      sawContent = true;
    }
  }

  let best: Delimiter = ",";
  let bestCount = 0;
  for (const candidate of candidates) {
    const count = counts.get(candidate) ?? 0;
    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }

  return best;
}

export type RawParsedCsv = {
  /** Every line as a row. A blank line is reported as [""] with the matching `blank` flag set. */
  rows: string[][];
  blank: boolean[];
};

/**
 * Parses CSV keeping blank lines as flagged rows, so a caller that knows the table shape can decide
 * what a blank line means: an empty value in a one-column file, or nothing in a wider one.
 */
export function parseCsvRaw(text: string, delimiter: Delimiter = ","): RawParsedCsv {
  const source = stripBom(text);
  const rows: string[][] = [];
  const blank: boolean[] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let fieldWasQuoted = false;
  let rowHasContent = false;
  let line = 1;
  let quoteOpenedOnLine = 1;

  const endField = () => {
    row.push(field);
    field = "";
    fieldWasQuoted = false;
  };

  const endRow = () => {
    if (!rowHasContent && row.length === 0 && field === "" && !fieldWasQuoted) {
      rows.push([""]);
      blank.push(true);
    } else {
      endField();
      rows.push(row);
      blank.push(false);
    }
    row = [];
    rowHasContent = false;
  };

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];

    if (inQuotes) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        if (char === "\n" || (char === "\r" && source[index + 1] !== "\n")) line += 1;
        field += char;
      }
      continue;
    }

    if (char === '"') {
      if (field !== "" || fieldWasQuoted) {
        // A quote in the middle of an unquoted field is kept literally; only a quote that follows
        // a closed quoted field is a structural error.
        if (fieldWasQuoted) {
          throw new CsvParseError(`Unexpected quote after the closing quote of a field on line ${line}.`, line);
        }
        field += char;
      } else {
        inQuotes = true;
        fieldWasQuoted = true;
        quoteOpenedOnLine = line;
      }
      rowHasContent = true;
    } else if (char === delimiter) {
      endField();
      rowHasContent = true;
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && source[index + 1] === "\n") index += 1;
      endRow();
      line += 1;
    } else {
      if (fieldWasQuoted) {
        throw new CsvParseError(`Unexpected character "${char}" after the closing quote of a field on line ${line}.`, line);
      }
      field += char;
      rowHasContent = true;
    }
  }

  if (inQuotes) {
    throw new CsvParseError(`A quoted field that starts on line ${quoteOpenedOnLine} is never closed.`, quoteOpenedOnLine);
  }

  if (rowHasContent || field !== "" || fieldWasQuoted || row.length > 0) {
    endField();
    rows.push(row);
    blank.push(false);
  }

  return { rows, blank };
}

/** Parses CSV, dropping completely blank lines (and counting them). */
export function parseCsv(text: string, delimiter: Delimiter = ","): ParsedCsv {
  const raw = parseCsvRaw(text, delimiter);
  const rows = raw.rows.filter((_, index) => !raw.blank[index]);
  return { rows, blankLinesSkipped: raw.rows.length - rows.length };
}

function needsQuoting(value: string, delimiter: Delimiter): boolean {
  return (
    value.includes(delimiter) ||
    value.includes('"') ||
    value.includes("\n") ||
    value.includes("\r") ||
    value.startsWith(" ") ||
    value.endsWith(" ")
  );
}

export function formatCsvField(value: string, delimiter: Delimiter = ","): string {
  return needsQuoting(value, delimiter) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function stringifyCsv(rows: string[][], delimiter: Delimiter = ",", lineBreak = "\n"): string {
  return rows
    .map((row) =>
      // A row holding a single empty value would be written as a blank line, which readers skip,
      // so it is written as a quoted empty field instead.
      row.length === 1 && row[0] === "" ? '""' : row.map((field) => formatCsvField(field, delimiter)).join(delimiter),
    )
    .join(lineBreak);
}
