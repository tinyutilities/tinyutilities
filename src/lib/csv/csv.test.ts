import { describe, expect, it } from "vitest";
import { CsvParseError, detectDelimiter, formatCsvField, parseCsv, stringifyCsv } from "./csv";

describe("parseCsv", () => {
  it("parses simple rows with LF, CRLF and CR endings", () => {
    const expected = [["a", "b"], ["1", "2"]];
    expect(parseCsv("a,b\n1,2").rows).toEqual(expected);
    expect(parseCsv("a,b\r\n1,2\r\n").rows).toEqual(expected);
    expect(parseCsv("a,b\r1,2\r").rows).toEqual(expected);
  });

  it("handles quoted fields containing delimiters, quotes and newlines", () => {
    const csv = 'name,note\n"Smith, John","He said ""hi"""\n"Line1\nLine2",x';
    expect(parseCsv(csv).rows).toEqual([
      ["name", "note"],
      ["Smith, John", 'He said "hi"'],
      ["Line1\nLine2", "x"],
    ]);
  });

  it("keeps CRLF inside quoted fields", () => {
    expect(parseCsv('"a\r\nb",c').rows).toEqual([["a\r\nb", "c"]]);
  });

  it("preserves empty fields, including trailing ones", () => {
    expect(parseCsv("a,,c,\n,,").rows).toEqual([["a", "", "c", ""], ["", "", ""]]);
  });

  it("distinguishes an empty quoted field from a blank line", () => {
    const result = parseCsv('a\n""\n\nb');
    expect(result.rows).toEqual([["a"], [""], ["b"]]);
    expect(result.blankLinesSkipped).toBe(1);
  });

  it("strips a UTF-8 BOM and supports other delimiters", () => {
    expect(parseCsv("﻿a;b\n1;2", ";").rows).toEqual([["a", "b"], ["1", "2"]]);
    expect(parseCsv("a\tb\n1\t2", "\t").rows).toEqual([["a", "b"], ["1", "2"]]);
    expect(parseCsv("a|b", "|").rows).toEqual([["a", "b"]]);
  });

  it("keeps a stray quote inside an unquoted field literally", () => {
    expect(parseCsv('5" pipe,x').rows).toEqual([['5" pipe', "x"]]);
  });

  it("preserves whitespace inside fields", () => {
    expect(parseCsv(" a , b ").rows).toEqual([[" a ", " b "]]);
  });

  it("reports an unterminated quote with the line it started on", () => {
    expect(() => parseCsv('a,b\n"oops,c')).toThrow(CsvParseError);
    expect(() => parseCsv('a,b\n"oops,c')).toThrow(/starts on line 2/);
  });

  it("reports text after a closing quote", () => {
    expect(() => parseCsv('"a"b,c')).toThrow(/after the closing quote.*line 1/);
  });

  it("returns no rows for empty input", () => {
    expect(parseCsv("").rows).toEqual([]);
  });
});

describe("stringifyCsv", () => {
  it("quotes only where needed", () => {
    expect(formatCsvField("plain")).toBe("plain");
    expect(formatCsvField("a,b")).toBe('"a,b"');
    expect(formatCsvField('say "hi"')).toBe('"say ""hi"""');
    expect(formatCsvField("two\nlines")).toBe('"two\nlines"');
    expect(formatCsvField(" padded")).toBe('" padded"');
    expect(formatCsvField("a;b", ";")).toBe('"a;b"');
    expect(formatCsvField("a,b", ";")).toBe("a,b");
  });

  it("writes a single empty value as a quoted field, not a blank line", () => {
    expect(stringifyCsv([["a"], [""], ["b"]])).toBe('a\n""\nb');
    expect(parseCsv(stringifyCsv([["a"], [""], ["b"]])).rows).toEqual([["a"], [""], ["b"]]);
    // Rows with several fields are unaffected.
    expect(stringifyCsv([["", ""]])).toBe(",");
  });

  it("round-trips awkward data through parse", () => {
    const rows = [
      ["id", "text"],
      ["1", 'He said "hello", then left'],
      ["2", "multi\nline"],
      ["3", ""],
      ["4", " spaced "],
      ["5", "tab\there"],
    ];

    for (const delimiter of [",", ";", "\t", "|"] as const) {
      expect(parseCsv(stringifyCsv(rows, delimiter), delimiter).rows).toEqual(rows);
    }
  });
});

describe("detectDelimiter", () => {
  it("picks the most common candidate on the first line", () => {
    expect(detectDelimiter("a,b,c\n1,2,3")).toBe(",");
    expect(detectDelimiter("a;b;c\n1;2;3")).toBe(";");
    expect(detectDelimiter("a\tb\tc")).toBe("\t");
    expect(detectDelimiter("a|b|c")).toBe("|");
  });

  it("ignores delimiters inside quotes and defaults to a comma", () => {
    expect(detectDelimiter('"a,b,c";d;e')).toBe(";");
    expect(detectDelimiter("single")).toBe(",");
    expect(detectDelimiter("")).toBe(",");
  });
});
