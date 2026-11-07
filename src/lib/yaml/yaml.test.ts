import * as yaml from "yaml";
import { describe, expect, it } from "vitest";
import { defaultYamlFormatOptions, findNonJsonValue, formatYaml, jsonToYaml, yamlToJson } from "./yaml";

const format = (input: string, overrides = {}) => formatYaml(yaml, input, { ...defaultYamlFormatOptions, ...overrides });

describe("formatYaml", () => {
  it("normalises indentation and keeps comments", () => {
    const result = format("# top comment\na:   1 # inline\nb:\n      - x\n      - y\n");
    expect(result.ok && result.output).toBe("# top comment\na: 1 # inline\nb:\n  - x\n  - y\n");
  });

  it("supports four-space indentation", () => {
    const result = format("a:\n  b:\n    c: 1\n", { indent: 4 });
    expect(result.ok && result.output).toBe("a:\n    b:\n        c: 1\n");
  });

  it("keeps key order by default and sorts at every level on request", () => {
    const input = "b: 1\na:\n  z: 1\n  y: 2\n";
    expect(format(input).ok && (format(input) as { output: string }).output).toBe("b: 1\na:\n  z: 1\n  y: 2\n");
    const sorted = format(input, { sortKeys: true });
    expect(sorted.ok && sorted.output).toBe("a:\n  y: 2\n  z: 1\nb: 1\n");
  });

  it("does not re-wrap long lines unless asked", () => {
    const long = `text: ${"word ".repeat(40).trim()}\n`;
    const kept = format(long);
    expect(kept.ok && kept.output).toBe(long);
    const wrapped = format(long, { lineWidth: 80 });
    expect(wrapped.ok && wrapped.output.split("\n").length).toBeGreaterThan(2);
  });

  it("preserves anchors, aliases and quoting styles", () => {
    const input = "base: &b\n  x: 1\nuse: *b\nsingle: 'it''s'\ndouble: \"a\\tb\"\n";
    const result = format(input);
    expect(result.ok && result.output).toBe("base: &b\n  x: 1\nuse: *b\nsingle: 'it''s'\ndouble: \"a\\tb\"\n");
  });

  it("is idempotent", () => {
    const once = format("a:   [1,2,   3]\nb: {c: 1,   d: 2}\n# c\n");
    expect(once.ok).toBe(true);
    if (!once.ok) return;
    const twice = format(once.output);
    expect(twice.ok && twice.output).toBe(once.output);
  });

  it("handles multiple documents", () => {
    const result = format("a: 1\n---\nb: 2\n");
    expect(result.ok && result.documents).toBe(2);
    expect(result.ok && result.output).toBe("a: 1\n---\nb: 2\n");
  });

  it("reports the document shape", () => {
    expect(format("- 1\n- 2\n").ok && (format("- 1\n- 2\n") as { rootType: string }).rootType).toBe("list");
    const mapping = format("a: 1\n");
    expect(mapping.ok && mapping.rootType).toBe("mapping");
    const scalar = format("hello\n");
    expect(scalar.ok && scalar.rootType).toBe("string");
  });

  it("treats empty input as valid and empty", () => {
    expect(format("  \n")).toEqual({ ok: true, warnings: [], output: "", documents: 0, rootType: "empty" });
  });
});

describe("formatYaml errors", () => {
  it("reports an unclosed flow sequence with its line and column", () => {
    const result = format("a: 1\nb: [1, 2\nc: 3\n");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues[0]).toMatchObject({ line: 3, column: 1 });
    expect(result.issues[0].message).toMatch(/Flow sequence/);
  });

  it("rejects duplicate keys instead of silently keeping one", () => {
    const result = format("a: 1\nb: 2\na: 3\n");
    expect(result.ok).toBe(false);
    expect(!result.ok && result.issues[0]).toMatchObject({ line: 3, message: "Map keys must be unique" });
  });

  it("rejects tab indentation", () => {
    const result = format("a:\n\t- b\n");
    expect(!result.ok && result.issues[0].message).toMatch(/Tabs are not allowed/);
  });

  it("rejects bad indentation inside a mapping", () => {
    const result = format("a:\n  b: 1\n c: 2\n");
    expect(result.ok).toBe(false);
  });

  it("rejects an unresolved alias", () => {
    const result = format("a: *missing\n");
    expect(result.ok).toBe(false);
  });

  it("collects errors from every document", () => {
    const result = format("a: 1\na: 2\n---\nb: [\n");
    expect(!result.ok && result.issues.length).toBeGreaterThanOrEqual(2);
  });
});

describe("yamlToJson", () => {
  it("converts mappings, lists and scalars with types", () => {
    const result = yamlToJson(yaml, "name: app\nport: 8080\nenabled: true\nratio: 1.5\nnothing: null\ntags: [a, b]\n");
    expect(result.ok && JSON.parse(result.output)).toEqual({ name: "app", port: 8080, enabled: true, ratio: 1.5, nothing: null, tags: ["a", "b"] });
  });

  it("expands anchors and merge keys", () => {
    const result = yamlToJson(yaml, "base: &b {x: 1}\nchild:\n  <<: *b\n  y: 2\n");
    expect(result.ok && JSON.parse(result.output).child).toEqual({ x: 1, y: 2 });
  });

  it("keeps ambiguous scalars as strings the way YAML 1.2 defines them", () => {
    const result = yamlToJson(yaml, "a: yes\nb: 007\nc: '123'\nd: 1e3\n");
    expect(result.ok && JSON.parse(result.output)).toEqual({ a: "yes", b: 7, c: "123", d: 1000 });
  });

  it("returns an array for multiple documents and says so", () => {
    const result = yamlToJson(yaml, "a: 1\n---\nb: 2\n");
    expect(result.ok && JSON.parse(result.output)).toEqual([{ a: 1 }, { b: 2 }]);
    expect(result.ok && result.warnings[0]).toMatch(/2 documents/);
  });

  it("refuses values JSON cannot hold instead of writing null", () => {
    const nan = yamlToJson(yaml, "ok: 1\nbad: .nan\n");
    expect(!nan.ok && nan.issues[0].message).toMatch(/\$\.bad is a number that is not finite/);
    const inf = yamlToJson(yaml, "list:\n  - 1\n  - .inf\n");
    expect(!inf.ok && inf.issues[0].message).toMatch(/\$\.list\[1\]/);
  });

  it("refuses mappings with non-text keys", () => {
    const result = yamlToJson(yaml, "? [a, b]\n: value\n");
    expect(result.ok).toBe(false);
  });

  it("limits alias expansion (billion-laughs style input)", () => {
    const lines = ["a: &a [x, x, x, x, x, x, x, x, x]"];
    for (let level = 1; level <= 7; level += 1) {
      const previous = String.fromCharCode(96 + level);
      const current = String.fromCharCode(97 + level);
      lines.push(`${current}: &${current} [${Array(9).fill(`*${previous}`).join(", ")}]`);
    }
    const result = yamlToJson(yaml, `${lines.join("\n")}\n`);
    expect(result.ok).toBe(false);
  });

  it("passes parse errors through and rejects empty input", () => {
    expect(yamlToJson(yaml, "a: [").ok).toBe(false);
    const empty = yamlToJson(yaml, " ");
    expect(!empty.ok && empty.issues[0].message).toMatch(/Paste or upload YAML/);
  });

  it("honours the indent option", () => {
    const result = yamlToJson(yaml, "a: 1\n", 4);
    expect(result.ok && result.output).toBe('{\n    "a": 1\n}');
  });
});

describe("jsonToYaml", () => {
  it("converts and round-trips", () => {
    const original = { name: "app", list: [1, 2, { x: true }], nested: { empty: null, text: "multi\nline" } };
    const result = jsonToYaml(yaml, JSON.stringify(original));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(yaml.parse(result.output)).toEqual(original);
  });

  it("quotes strings that would otherwise change type", () => {
    const result = jsonToYaml(yaml, '{"a": "true", "b": "123", "c": "null", "d": "yes", "e": ""}');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(yaml.parse(result.output)).toEqual({ a: "true", b: "123", c: "null", d: "yes", e: "" });
  });

  it("reports invalid JSON and empty input", () => {
    const bad = jsonToYaml(yaml, "{oops");
    expect(!bad.ok && bad.error).toMatch(/not valid JSON/);
    expect(jsonToYaml(yaml, "").ok).toBe(false);
  });

  it("warns about integers JSON.parse cannot hold exactly", () => {
    const result = jsonToYaml(yaml, '{"id": 12345678901234567890}');
    expect(result.ok && result.warnings[0]).toMatch(/larger than/);
  });
});

describe("findNonJsonValue", () => {
  it("finds the first unrepresentable value with its path", () => {
    expect(findNonJsonValue({ a: [1, { b: Number.NaN }] })).toEqual({ path: "$.a[1].b", reason: "a number that is not finite (.nan or .inf)" });
    expect(findNonJsonValue({ a: BigInt(1) })?.path).toBe("$.a");
    expect(findNonJsonValue({ a: new Map() })?.path).toBe("$.a");
    expect(findNonJsonValue({ a: [1, "x", null, true] })).toBeNull();
  });
});
