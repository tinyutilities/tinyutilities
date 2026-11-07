import { describe, expect, it } from "vitest";
import { defaultLineOptions, processLines, type LineOptions } from "./lines";

const run = (text: string, overrides: Partial<LineOptions>) =>
  processLines(text, { ...defaultLineOptions, locale: "en", ...overrides });

describe("whitespace options", () => {
  it("trims lines", () => {
    expect(run("  a  \n\tb\t", { trimLines: true }).text).toBe("a\nb");
  });

  it("collapses runs of spaces and tabs inside lines", () => {
    expect(run("a   b\t\tc", { collapseSpaces: true }).text).toBe("a b c");
  });

  it("removes empty and whitespace-only lines and counts them", () => {
    const result = run("a\n\n   \nb", { removeEmpty: true });
    expect(result.text).toBe("a\nb");
    expect(result.stats).toEqual({ inputLines: 4, outputLines: 2, emptyRemoved: 2, duplicatesRemoved: 0 });
  });
});

describe("duplicate removal", () => {
  it("keeps the first occurrence and original order", () => {
    const result = run("b\na\nb\nc\na", { removeDuplicates: true });
    expect(result.text).toBe("b\na\nc");
    expect(result.stats.duplicatesRemoved).toBe(2);
  });

  it("is case-sensitive unless asked otherwise", () => {
    expect(run("Apple\napple", { removeDuplicates: true }).text).toBe("Apple\napple");
    expect(run("Apple\napple", { removeDuplicates: true, ignoreCaseForDuplicates: true }).text).toBe("Apple");
  });

  it("compares after trimming when trim is on", () => {
    expect(run("a\n a ", { trimLines: true, removeDuplicates: true }).text).toBe("a");
  });
});

describe("sorting", () => {
  it("sorts ascending and descending", () => {
    expect(run("banana\napple\ncherry", { sort: "asc" }).text).toBe("apple\nbanana\ncherry");
    expect(run("banana\napple\ncherry", { sort: "desc" }).text).toBe("cherry\nbanana\napple");
  });

  it("sorts numbers naturally only when asked", () => {
    expect(run("item10\nitem2\nitem1", { sort: "asc" }).text).toBe("item1\nitem10\nitem2");
    expect(run("item10\nitem2\nitem1", { sort: "asc", naturalSort: true }).text).toBe("item1\nitem2\nitem10");
  });

  it("can ignore case when sorting", () => {
    expect(run("b\nA\nc", { sort: "asc", ignoreCaseForSort: true }).text).toBe("A\nb\nc");
  });

  it("sorts by length and keeps equal lengths in original order", () => {
    expect(run("ccc\na\nbb\nd", { sort: "length-asc" }).text).toBe("a\nd\nbb\nccc");
    expect(run("ccc\na\nbb\nd", { sort: "length-desc" }).text).toBe("ccc\nbb\na\nd");
  });

  it("reverses line order", () => {
    expect(run("1\n2\n3", { sort: "reverse" }).text).toBe("3\n2\n1");
  });
});

describe("line endings", () => {
  it("preserves CRLF and a trailing newline", () => {
    expect(run("b\r\na\r\n", { sort: "asc" }).text).toBe("a\r\nb\r\n");
  });

  it("does not add a trailing newline that was not there", () => {
    expect(run("b\na", { sort: "asc" }).text).toBe("a\nb");
  });

  it("handles empty input and all-removed input", () => {
    expect(run("", { removeEmpty: true }).text).toBe("");
    expect(run("\n\n", { removeEmpty: true })).toEqual({
      text: "",
      stats: { inputLines: 2, outputLines: 0, emptyRemoved: 2, duplicatesRemoved: 0 },
    });
  });
});

describe("combined pipeline", () => {
  it("cleans a messy list end to end", () => {
    const result = run("  pear \n\napple\nPear\n  apple  \n", {
      trimLines: true,
      removeEmpty: true,
      removeDuplicates: true,
      ignoreCaseForDuplicates: true,
      sort: "asc",
    });
    expect(result.text).toBe("apple\npear\n");
    expect(result.stats).toEqual({ inputLines: 5, outputLines: 2, emptyRemoved: 1, duplicatesRemoved: 2 });
  });
});
