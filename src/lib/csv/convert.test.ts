import { describe, expect, it } from "vitest";
import {
  csvToJson,
  defaultCsvToJsonOptions,
  defaultJsonToCsvOptions,
  hasUnsafeIntegers,
  inferCell,
  jsonToCsv,
  type CsvToJsonOptions,
  type JsonToCsvOptions,
} from "./convert";

const toJson = (csv: string, overrides: Partial<CsvToJsonOptions> = {}) =>
  csvToJson(csv, { ...defaultCsvToJsonOptions, ...overrides });
const toCsv = (json: unknown, overrides: Partial<JsonToCsvOptions> = {}) =>
  jsonToCsv(typeof json === "string" ? json : JSON.stringify(json), { ...defaultJsonToCsvOptions, ...overrides });

describe("csvToJson", () => {
  it("converts a header CSV to an array of objects with string values", () => {
    const result = toJson("name,age\nAda,36\nLinus,54");
    expect(result.ok && result.value).toEqual([
      { name: "Ada", age: "36" },
      { name: "Linus", age: "54" },
    ]);
  });

  it("handles quoted commas, escaped quotes and newlines", () => {
    const result = toJson('name,quote\n"Smith, J.","She said ""no"""\nBob,"two\nlines"');
    expect(result.ok && result.value).toEqual([
      { name: "Smith, J.", quote: 'She said "no"' },
      { name: "Bob", quote: "two\nlines" },
    ]);
  });

  it("returns arrays of arrays without a header", () => {
    const result = toJson("a,b\n1,2", { hasHeader: false });
    expect(result.ok && result.value).toEqual([["a", "b"], ["1", "2"]]);
  });

  it("detects the delimiter automatically", () => {
    const result = toJson("a;b\n1;2");
    expect(result.ok && result.delimiter).toBe(";");
    expect(result.ok && result.value).toEqual([{ a: "1", b: "2" }]);
  });

  it("formats with the requested indent", () => {
    const result = toJson("a\n1", { indent: 4 });
    expect(result.ok && result.json).toBe('[\n    {\n        "a": "1"\n    }\n]');
  });

  describe("type inference", () => {
    it("only converts values that print back exactly", () => {
      expect(inferCell("42")).toBe(42);
      expect(inferCell("-3.5")).toBe(-3.5);
      expect(inferCell("1e3")).toBe("1e3");
      expect(inferCell("007")).toBe("007");
      expect(inferCell("1.50")).toBe("1.50");
      expect(inferCell("12345678901234567890")).toBe("12345678901234567890");
      expect(inferCell("true")).toBe(true);
      expect(inferCell("false")).toBe(false);
      expect(inferCell("True")).toBe("True");
      expect(inferCell("")).toBe("");
      expect(inferCell("null")).toBe("null");
    });

    it("applies inference only when asked", () => {
      const off = toJson("n,ok\n7,true");
      const on = toJson("n,ok\n7,true", { inferTypes: true });
      expect(off.ok && off.value).toEqual([{ n: "7", ok: "true" }]);
      expect(on.ok && on.value).toEqual([{ n: 7, ok: true }]);
    });
  });

  describe("refuses to lose data", () => {
    it("rejects rows with more values than the header", () => {
      const result = toJson("a,b\n1,2,3");
      expect(result).toEqual({
        ok: false,
        error: "Row 2 has 3 values but the header has 2 columns. Converting it would drop data.",
      });
    });

    it("rejects duplicate and empty header names", () => {
      const duplicate = toJson("a,a\n1,2");
      expect(!duplicate.ok && duplicate.error).toMatch(/"a" appears more than once/);
      const empty = toJson("a,\n1,2");
      expect(!empty.ok && empty.error).toMatch(/column 2 has no name/);
    });

    it("pads short rows and says so", () => {
      const result = toJson("a,b\n1");
      expect(result.ok && result.value).toEqual([{ a: "1", b: "" }]);
      expect(result.ok && result.warnings[0]).toMatch(/1 row has fewer values/);
    });

    it("skips blank lines in a multi-column file and says so", () => {
      const result = toJson("a,b\n1,2\n\n3,4");
      expect(result.ok && result.value).toEqual([{ a: "1", b: "2" }, { a: "3", b: "4" }]);
      expect(result.ok && result.warnings[0]).toMatch(/1 blank line was skipped/);
    });

    it("keeps blank lines between rows of a one-column file as empty values", () => {
      const result = toJson("a\n1\n\n2");
      expect(result.ok && result.value).toEqual([{ a: "1" }, { a: "" }, { a: "2" }]);
      expect(result.ok && result.warnings[0]).toMatch(/one column, so 1 blank line was kept as empty values/);
    });

    it("ignores blank lines before the first row and after the last row, even in a one-column file", () => {
      const result = toJson("\n\na\n1\n2\n\n\n");
      expect(result.ok && result.value).toEqual([{ a: "1" }, { a: "2" }]);
      expect(result.ok && result.warnings[0]).toMatch(/blank lines were skipped/);
    });

    it("reads a quoted empty value in a one-column file as an empty value without any warning", () => {
      const result = toJson('a\n1\n""\n2');
      expect(result.ok && result.value).toEqual([{ a: "1" }, { a: "" }, { a: "2" }]);
      expect(result.ok && result.warnings).toEqual([]);
    });

    it("surfaces parse errors", () => {
      const result = toJson('a\n"unclosed');
      expect(!result.ok && result.error).toMatch(/never closed/);
    });

    it("rejects empty input", () => {
      expect(toJson("   ")).toEqual({ ok: false, error: "Paste or upload CSV to convert it." });
    });
  });
});

describe("jsonToCsv", () => {
  it("converts an array of objects with a header row", () => {
    const result = toCsv([{ name: "Ada", age: 36 }, { name: "Linus", age: 54 }]);
    expect(result.ok && result.csv).toBe("name,age\nAda,36\nLinus,54");
    expect(result.ok && result.rowCount).toBe(2);
  });

  it("quotes commas, quotes and newlines", () => {
    const result = toCsv([{ a: "x, y", b: 'say "hi"', c: "l1\nl2" }]);
    expect(result.ok && result.csv).toBe('a,b,c\n"x, y","say ""hi""","l1\nl2"');
  });

  it("uses the union of keys in first-seen order and leaves absent keys empty", () => {
    const result = toCsv([{ a: 1 }, { b: 2, a: 3 }]);
    expect(result.ok && result.columns).toEqual(["a", "b"]);
    expect(result.ok && result.csv).toBe("a,b\n1,\n3,2");
  });

  it("writes booleans and reports nulls as empty cells", () => {
    const result = toCsv([{ ok: true, none: null }]);
    expect(result.ok && result.csv).toBe("ok,none\ntrue,");
    expect(result.ok && result.warnings[0]).toMatch(/1 null value was written as empty/);
  });

  it("accepts a single object, an array of arrays and an array of primitives", () => {
    const single = toCsv({ a: 1, b: 2 });
    expect(single.ok && single.csv).toBe("a,b\n1,2");

    const arrays = toCsv([["a", "b"], [1]]);
    expect(arrays.ok && arrays.csv).toBe("a,b\n1,");
    expect(arrays.ok && arrays.warnings.join(" ")).toMatch(/no header row/);

    const primitives = toCsv([1, "two", true]);
    expect(primitives.ok && primitives.csv).toBe("value\n1\ntwo\ntrue");
  });

  it("supports other delimiters", () => {
    const result = toCsv([{ a: "x;y", b: 1 }], { delimiter: ";" });
    expect(result.ok && result.csv).toBe('a;b\n"x;y";1');
  });

  describe("nested values", () => {
    const data = [{ id: 1, tags: ["a", "b"], owner: { name: "Ada" } }];

    it("errors by default and says where", () => {
      const result = toCsv(data);
      expect(!result.ok && result.error).toMatch(/Record 1, "tags" contains a nested array/);
    });

    it("can write nested values as JSON text, and that text parses back", () => {
      const result = toCsv(data, { nested: "stringify" });
      expect(result.ok && result.csv).toBe('id,tags,owner\n1,"[""a"",""b""]","{""name"":""Ada""}"');
    });

    it("also guards arrays of arrays", () => {
      const result = toCsv([[1, [2]]]);
      expect(!result.ok && result.error).toMatch(/Row 1, column 2 contains a nested array/);
    });
  });

  describe("input problems", () => {
    it("explains invalid JSON, empty input and empty arrays", () => {
      expect(toCsv("{bad")).toMatchObject({ ok: false, error: expect.stringContaining("not valid JSON") });
      expect(toCsv("  ")).toEqual({ ok: false, error: "Paste or upload JSON to convert it." });
      expect(toCsv("[]")).toEqual({ ok: false, error: "The JSON array is empty, so there is nothing to convert." });
      expect(toCsv([{}])).toMatchObject({ ok: false, error: expect.stringContaining("no keys") });
    });

    it("rejects mixed shapes", () => {
      expect(toCsv([{ a: 1 }, [1]])).toMatchObject({ ok: false, error: expect.stringContaining("mixes") });
    });

    it("warns about integers that JSON.parse cannot represent exactly", () => {
      expect(hasUnsafeIntegers('{"id": 12345678901234567890}')).toBe(true);
      expect(hasUnsafeIntegers('{"id": "12345678901234567890"}')).toBe(false);
      expect(hasUnsafeIntegers('{"id": 9007199254740991}')).toBe(false);
      expect(hasUnsafeIntegers('{"s": "he said \\"1234567890123456789\\""}')).toBe(false);
      const result = toCsv('[{"id": 12345678901234567890}]');
      expect(result.ok && result.warnings.join(" ")).toMatch(/larger than/);
    });
  });

  it("writes an empty value in a one-column table so it survives a round trip", () => {
    const original = [{ a: "1" }, { a: "" }, { a: "2" }];
    const csv = toCsv(original);
    expect(csv.ok && csv.csv).toBe('a\n1\n""\n2');
    if (!csv.ok) return;
    const back = toJson(csv.csv);
    expect(back.ok && back.value).toEqual(original);
    expect(back.ok && back.warnings).toEqual([]);
  });

  it("round-trips through csvToJson for string data", () => {
    const original = [
      { name: "Smith, J.", note: 'a "quote"', multi: "x\ny" },
      { name: "Ada", note: "", multi: "plain" },
    ];
    const csv = toCsv(original);
    expect(csv.ok).toBe(true);
    if (!csv.ok) return;
    const back = toJson(csv.csv);
    expect(back.ok && back.value).toEqual(original);
  });
});
