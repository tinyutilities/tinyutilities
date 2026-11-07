import { CsvParseError, detectDelimiter, parseCsvRaw, stringifyCsv, type Delimiter } from "./csv";

/**
 * JSON ↔ CSV conversion that refuses to lose data silently. Anything that can't be represented
 * faithfully is either an explicit error or an explicit, reported option.
 */

export type ConvertSuccess<T> = { ok: true; warnings: string[] } & T;
export type ConvertFailure = { ok: false; error: string };

// ---------------------------------------------------------------------------------------------
// CSV → JSON
// ---------------------------------------------------------------------------------------------

export type CsvToJsonOptions = {
  /** A delimiter, or "auto" to detect it from the first line. */
  delimiter: Delimiter | "auto";
  /** First row holds column names; output is an array of objects. Otherwise an array of arrays. */
  hasHeader: boolean;
  /** Convert cells that are exact, round-trippable numbers or true/false into JSON numbers/booleans. */
  inferTypes: boolean;
  indent?: 2 | 4;
};

export const defaultCsvToJsonOptions: CsvToJsonOptions = {
  delimiter: "auto",
  hasHeader: true,
  inferTypes: false,
  indent: 2,
};

const exactNumber = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/;

/**
 * Only converts when the number prints back exactly as written, so "007", "1.50" and
 * "12345678901234567890" stay strings instead of silently changing.
 */
export function inferCell(cell: string): string | number | boolean {
  if (cell === "true") return true;
  if (cell === "false") return false;
  if (exactNumber.test(cell)) {
    const value = Number(cell);
    if (Number.isFinite(value) && String(value) === cell) return value;
  }
  return cell;
}

export function csvToJson(
  text: string,
  options: CsvToJsonOptions = defaultCsvToJsonOptions,
): ConvertSuccess<{ json: string; value: unknown[]; rowCount: number; delimiter: Delimiter }> | ConvertFailure {
  if (text.trim() === "") {
    return { ok: false, error: "Paste or upload CSV to convert it." };
  }

  const delimiter = options.delimiter === "auto" ? detectDelimiter(text) : options.delimiter;
  const warnings: string[] = [];

  let raw;
  try {
    raw = parseCsvRaw(text, delimiter);
  } catch (error) {
    if (error instanceof CsvParseError) return { ok: false, error: error.message };
    throw error;
  }

  const firstContent = raw.blank.findIndex((isBlank) => !isBlank);

  if (firstContent === -1) {
    return { ok: false, error: "No rows were found in this CSV." };
  }

  // In a one-column file a blank line is a legitimate empty value, so blank lines between rows are
  // kept as empty values. In a wider file a blank line can't be a row, so it is skipped. Blank lines
  // before the first row or after the last row are never data.
  const isSingleColumn = raw.rows[firstContent].length === 1;
  const lastContent = raw.blank.lastIndexOf(false);
  const rows: string[][] = [];
  let skippedBlankLines = 0;
  let keptBlankLines = 0;

  raw.rows.forEach((row, index) => {
    if (!raw.blank[index]) {
      rows.push(row);
    } else if (isSingleColumn && index > firstContent && index < lastContent) {
      rows.push([""]);
      keptBlankLines += 1;
    } else {
      skippedBlankLines += 1;
    }
  });

  if (keptBlankLines > 0) {
    warnings.push(
      `This CSV has one column, so ${keptBlankLines} blank line${keptBlankLines === 1 ? " was" : "s were"} kept as empty values.`,
    );
  }

  if (skippedBlankLines > 0) {
    warnings.push(`${skippedBlankLines} blank line${skippedBlankLines === 1 ? " was" : "s were"} skipped.`);
  }

  const convertCell = (cell: string) => (options.inferTypes ? inferCell(cell) : cell);
  let value: unknown[];

  if (options.hasHeader) {
    const [headerRow, ...dataRows] = rows;
    const seen = new Set<string>();

    for (let index = 0; index < headerRow.length; index += 1) {
      const name = headerRow[index];
      if (name === "") {
        return { ok: false, error: `Header column ${index + 1} has no name. Name every column, or turn off "First row is a header".` };
      }
      if (seen.has(name)) {
        return {
          ok: false,
          error: `The header "${name}" appears more than once, so one column would overwrite the other. Rename the duplicate columns, or turn off "First row is a header".`,
        };
      }
      seen.add(name);
    }

    let paddedRows = 0;
    const objects: Record<string, unknown>[] = [];

    for (let index = 0; index < dataRows.length; index += 1) {
      const dataRow = dataRows[index];

      if (dataRow.length > headerRow.length) {
        return {
          ok: false,
          error: `Row ${index + 2} has ${dataRow.length} values but the header has ${headerRow.length} columns. Converting it would drop data.`,
        };
      }

      if (dataRow.length < headerRow.length) paddedRows += 1;

      const entry: Record<string, unknown> = {};
      headerRow.forEach((name, columnIndex) => {
        entry[name] = columnIndex < dataRow.length ? convertCell(dataRow[columnIndex]) : "";
      });
      objects.push(entry);
    }

    if (paddedRows > 0) {
      warnings.push(
        `${paddedRows} row${paddedRows === 1 ? " has" : "s have"} fewer values than the header; the missing cells were set to empty strings.`,
      );
    }

    value = objects;
  } else {
    value = rows.map((row) => row.map(convertCell));
  }

  return {
    ok: true,
    warnings,
    value,
    json: JSON.stringify(value, null, options.indent ?? 2),
    rowCount: value.length,
    delimiter,
  };
}

// ---------------------------------------------------------------------------------------------
// JSON → CSV
// ---------------------------------------------------------------------------------------------

export type JsonToCsvOptions = {
  delimiter: Delimiter;
  /** What to do with nested objects/arrays inside a record: refuse, or write them as JSON text. */
  nested: "error" | "stringify";
};

export const defaultJsonToCsvOptions: JsonToCsvOptions = { delimiter: ",", nested: "error" };

/** True if the JSON source text contains an integer too large to survive JSON.parse exactly. */
export function hasUnsafeIntegers(jsonText: string): boolean {
  let inString = false;

  for (let index = 0; index < jsonText.length; index += 1) {
    const char = jsonText[index];

    if (inString) {
      if (char === "\\") index += 1;
      else if (char === '"') inString = false;
      continue;
    }

    if (char === '"') {
      inString = true;
    } else if (char === "-" || (char >= "0" && char <= "9")) {
      let end = index + 1;
      while (end < jsonText.length && /[0-9.eE+-]/.test(jsonText[end])) end += 1;
      const token = jsonText.slice(index, end);

      if (/^-?\d{16,}$/.test(token) && BigInt(token) > BigInt(Number.MAX_SAFE_INTEGER)) return true;
      if (/^-?\d{16,}$/.test(token) && BigInt(token) < -BigInt(Number.MAX_SAFE_INTEGER)) return true;
      index = end - 1;
    }
  }

  return false;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function jsonToCsv(
  jsonText: string,
  options: JsonToCsvOptions = defaultJsonToCsvOptions,
): ConvertSuccess<{ csv: string; rowCount: number; columns: string[] }> | ConvertFailure {
  if (jsonText.trim() === "") {
    return { ok: false, error: "Paste or upload JSON to convert it." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    return { ok: false, error: `This is not valid JSON: ${error instanceof Error ? error.message : "parse error"}` };
  }

  const warnings: string[] = [];

  if (hasUnsafeIntegers(jsonText)) {
    warnings.push(
      "This JSON contains integers larger than 9,007,199,254,740,991, which cannot be represented exactly in a browser. Their last digits may have changed; keep such values as strings in the JSON.",
    );
  }

  const records: unknown[] = Array.isArray(parsed) ? parsed : [parsed];

  if (records.length === 0) {
    return { ok: false, error: "The JSON array is empty, so there is nothing to convert." };
  }

  let nullCount = 0;

  const cellText = (value: unknown, location: string): string | ConvertFailure => {
    if (value === null) {
      nullCount += 1;
      return "";
    }
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    if (options.nested === "stringify") return JSON.stringify(value);
    return {
      ok: false,
      error: `${location} contains a nested ${Array.isArray(value) ? "array" : "object"}, which a flat CSV can't represent. Choose "Write nested values as JSON text" to keep it, or flatten the JSON first.`,
    };
  };

  const allObjects = records.every(isPlainObject);
  const allArrays = records.every(Array.isArray);
  const rows: string[][] = [];
  let columns: string[];

  if (allObjects) {
    const objects = records as Record<string, unknown>[];
    const keyOrder: string[] = [];
    const seen = new Set<string>();

    for (const record of objects) {
      for (const key of Object.keys(record)) {
        if (!seen.has(key)) {
          seen.add(key);
          keyOrder.push(key);
        }
      }
    }

    if (keyOrder.length === 0) {
      return { ok: false, error: "The JSON objects have no keys, so there are no columns to write." };
    }

    columns = keyOrder;
    rows.push(columns);

    for (let rowIndex = 0; rowIndex < objects.length; rowIndex += 1) {
      const row: string[] = [];
      for (const key of columns) {
        const cell = key in objects[rowIndex] ? cellText(objects[rowIndex][key], `Record ${rowIndex + 1}, "${key}"`) : "";
        if (typeof cell !== "string") return cell;
        row.push(cell);
      }
      rows.push(row);
    }
  } else if (allArrays) {
    const arrays = records as unknown[][];
    const width = Math.max(...arrays.map((row) => row.length));
    columns = Array.from({ length: width }, (_, index) => `column_${index + 1}`);

    for (let rowIndex = 0; rowIndex < arrays.length; rowIndex += 1) {
      const row: string[] = [];
      for (let columnIndex = 0; columnIndex < arrays[rowIndex].length; columnIndex += 1) {
        const cell = cellText(arrays[rowIndex][columnIndex], `Row ${rowIndex + 1}, column ${columnIndex + 1}`);
        if (typeof cell !== "string") return cell;
        row.push(cell);
      }
      while (row.length < width) row.push("");
      rows.push(row);
    }

    warnings.push("The JSON is an array of arrays, so no header row was written.");
  } else if (records.every((record) => record === null || ["string", "number", "boolean"].includes(typeof record))) {
    columns = ["value"];
    rows.push(columns);

    for (let rowIndex = 0; rowIndex < records.length; rowIndex += 1) {
      const cell = cellText(records[rowIndex], `Item ${rowIndex + 1}`);
      if (typeof cell !== "string") return cell;
      rows.push([cell]);
    }
  } else {
    return {
      ok: false,
      error: "The JSON mixes objects, arrays and plain values. Use an array of objects (or an array of arrays) so every row has the same shape.",
    };
  }

  if (nullCount > 0) {
    warnings.push(`${nullCount} null value${nullCount === 1 ? " was" : "s were"} written as empty cells (CSV has no separate null).`);
  }

  return {
    ok: true,
    warnings,
    csv: stringifyCsv(rows, options.delimiter),
    rowCount: allArrays ? rows.length : rows.length - 1,
    columns,
  };
}
