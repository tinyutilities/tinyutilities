import { describe, expect, it } from "vitest";
import { caseModes, convertCase, splitWords } from "./case";

describe("splitWords", () => {
  it.each([
    ["hello world", ["hello", "world"]],
    ["helloWorld", ["hello", "World"]],
    ["HelloWorld", ["Hello", "World"]],
    ["snake_case_name", ["snake", "case", "name"]],
    ["kebab-case-name", ["kebab", "case", "name"]],
    ["XMLHttpRequest", ["XML", "Http", "Request"]],
    ["parseHTML", ["parse", "HTML"]],
    ["version2Beta", ["version", "2", "Beta"]],
    ["HTML5", ["HTML", "5"]],
    ["don't stop", ["dont", "stop"]],
    ["  --  ", []],
    ["éclair au café", ["éclair", "au", "café"]],
  ])("splits %j", (input, expected) => {
    expect(splitWords(input)).toEqual(expected);
  });
});

describe("simple modes", () => {
  it("upper and lower case", () => {
    expect(convertCase("Hello, World! 123", "upper")).toBe("HELLO, WORLD! 123");
    expect(convertCase("Hello, World! 123", "lower")).toBe("hello, world! 123");
  });

  it("swap case", () => {
    expect(convertCase("Hello World 1", "swap")).toBe("hELLO wORLD 1");
  });

  it("alternating case counts letters only", () => {
    expect(convertCase("hello world", "alternating")).toBe("hElLo WoRlD");
  });
});

describe("title case", () => {
  it("capitalises every word and lowercases the rest", () => {
    expect(convertCase("the QUICK brown fox", "title")).toBe("The Quick Brown Fox");
    expect(convertCase("well-known fact", "title")).toBe("Well-Known Fact");
    expect(convertCase("don't stop", "title")).toBe("Don't Stop");
  });

  it("optionally keeps small words lower except at the edges", () => {
    expect(convertCase("the lord of the rings", "title", { keepSmallWordsLower: true })).toBe("The Lord of the Rings");
    expect(convertCase("what to look for in", "title", { keepSmallWordsLower: true })).toBe("What to Look for In");
  });

  it("preserves punctuation and spacing", () => {
    expect(convertCase("  hello,   world!  ", "title")).toBe("  Hello,   World!  ");
  });
});

describe("sentence case", () => {
  it("capitalises the first letter of each sentence", () => {
    expect(convertCase("HELLO WORLD. this IS a test! really? yes", "sentence")).toBe(
      "Hello world. This is a test! Really? Yes",
    );
  });

  it("treats line breaks as sentence starts", () => {
    expect(convertCase("first LINE\nsecond line", "sentence")).toBe("First line\nSecond line");
  });

  it("does not capitalise after a decimal point or abbreviation-free digits", () => {
    expect(convertCase("pi is 3.14 today", "sentence")).toBe("Pi is 3.14 today");
  });
});

describe("identifier modes", () => {
  const input = "Hello big world";

  it.each([
    ["camel", "helloBigWorld"],
    ["pascal", "HelloBigWorld"],
    ["snake", "hello_big_world"],
    ["kebab", "hello-big-world"],
    ["constant", "HELLO_BIG_WORLD"],
    ["dot", "hello.big.world"],
    ["path", "hello/big/world"],
  ] as const)("%s", (mode, expected) => {
    expect(convertCase(input, mode)).toBe(expected);
  });

  it("converts between identifier styles", () => {
    expect(convertCase("myVariableName", "snake")).toBe("my_variable_name");
    expect(convertCase("my_variable_name", "camel")).toBe("myVariableName");
    expect(convertCase("XMLHttpRequest", "kebab")).toBe("xml-http-request");
    expect(convertCase("some-css-class", "pascal")).toBe("SomeCssClass");
  });

  it("converts line by line and keeps line endings", () => {
    expect(convertCase("first line\r\nsecond line\nthird", "snake")).toBe("first_line\r\nsecond_line\nthird");
  });

  it("keeps digits as their own words", () => {
    expect(convertCase("version 2 beta", "camel")).toBe("version2Beta");
  });
});

describe("mode list", () => {
  it("has a unique value for every mode and handles empty input", () => {
    const values = caseModes.map((mode) => mode.value);
    expect(new Set(values).size).toBe(values.length);
    for (const value of values) {
      expect(convertCase("", value)).toBe("");
    }
  });
});
