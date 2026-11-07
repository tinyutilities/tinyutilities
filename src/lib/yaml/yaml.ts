import { hasUnsafeIntegers } from "@/lib/csv/convert";

/**
 * YAML formatting, validation and YAML ↔ JSON conversion on top of the `yaml` package (YAML 1.2,
 * ISC licence). The package is passed in rather than imported here so the browser can load it
 * lazily while tests use it directly. Comments, anchors and quoting styles are preserved when
 * formatting; key order is kept unless sorting is requested.
 */

type YamlModule = typeof import("yaml");

export type YamlIssue = { message: string; line: number; column: number };

export type YamlFormatOptions = {
  indent: 2 | 4;
  /** Sort mapping keys alphabetically (by code point) at every level. */
  sortKeys: boolean;
  /** 0 never re-wraps long lines; otherwise long plain/quoted scalars are folded at this width. */
  lineWidth: 0 | 80 | 120;
};

export const defaultYamlFormatOptions: YamlFormatOptions = { indent: 2, sortKeys: false, lineWidth: 0 };

export type YamlSuccess<T> = { ok: true; warnings: string[] } & T;
export type YamlFailure = { ok: false; issues: YamlIssue[] };

function issuesFrom(errors: Array<{ message: string; linePos?: [{ line: number; col: number }, { line: number; col: number }?] }>): YamlIssue[] {
  return errors.map((error) => ({
    // yaml's messages end with a code excerpt; the first line is the readable part.
    message: error.message.split("\n")[0].replace(/ at line \d+, column \d+:?$/, ""),
    line: error.linePos?.[0]?.line ?? 1,
    column: error.linePos?.[0]?.col ?? 1,
  }));
}

function parseDocuments(yaml: YamlModule, input: string) {
  const lineCounter = new yaml.LineCounter();
  const documents = yaml.parseAllDocuments(input, { prettyErrors: true, uniqueKeys: true, merge: true, lineCounter });
  return { documents, lineCounter };
}

/**
 * Problems the parser doesn't report as errors but that make later steps throw or change data:
 * aliases to anchors that don't exist and, when converting to JSON, mapping keys that aren't text.
 */
function semanticIssues(
  yaml: YamlModule,
  document: import("yaml").Document.Parsed,
  lineCounter: InstanceType<YamlModule["LineCounter"]>,
  rejectComplexKeys: boolean,
): YamlIssue[] {
  const issues: YamlIssue[] = [];
  const at = (node: { range?: [number, number, number] | null } | null | undefined) => {
    const position = node?.range ? lineCounter.linePos(node.range[0]) : { line: 1, col: 1 };
    return { line: position.line, column: position.col };
  };

  yaml.visit(document, {
    Alias(_key, alias) {
      if (!alias.resolve(document)) {
        issues.push({ message: `The alias *${alias.source} refers to an anchor (&${alias.source}) that is not defined before it`, ...at(alias) });
      }
    },
    Pair(_key, pair) {
      if (rejectComplexKeys && pair.key !== null && !yaml.isScalar(pair.key)) {
        issues.push({ message: "This mapping key is a list or mapping, which JSON can't use as a key", ...at(pair.key as { range?: [number, number, number] }) });
      }
    },
  });

  return issues;
}

function rootType(value: unknown): string {
  if (Array.isArray(value)) return "list";
  if (value === null) return "null";
  if (typeof value === "object") return "mapping";
  return typeof value;
}

export type YamlFormatResult = YamlSuccess<{ output: string; documents: number; rootType: string }> | YamlFailure;

/** Parses, validates and re-emits YAML. Fails with every problem found, each with line and column. */
export function formatYaml(yaml: YamlModule, input: string, options: YamlFormatOptions = defaultYamlFormatOptions): YamlFormatResult {
  if (input.trim() === "") {
    return { ok: true, warnings: [], output: "", documents: 0, rootType: "empty" };
  }

  const { documents, lineCounter } = parseDocuments(yaml, input);
  const issues = documents.flatMap((document) => [...issuesFrom(document.errors), ...(document.errors.length ? [] : semanticIssues(yaml, document, lineCounter, false))]);

  if (issues.length > 0) return { ok: false, issues };

  const warnings = documents.flatMap((document) => issuesFrom(document.warnings).map((issue) => `Line ${issue.line}: ${issue.message}`));

  let shape: string;

  try {
    shape = rootType(documents[0].toJS({ maxAliasCount: 100 }));
  } catch (error) {
    return { ok: false, issues: [{ message: error instanceof Error ? error.message.split("\n")[0] : "This YAML could not be read.", line: 1, column: 1 }] };
  }

  const rendered = documents.map((document) => {
    if (options.sortKeys) {
      yaml.visit(document, {
        Map(_key, map) {
          map.items.sort((a, b) => {
            const left = String(yaml.isScalar(a.key) ? a.key.value : a.key);
            const right = String(yaml.isScalar(b.key) ? b.key.value : b.key);
            return left < right ? -1 : left > right ? 1 : 0;
          });
        },
      });
    }

    return document.toString({ indent: options.indent, lineWidth: options.lineWidth, indentSeq: true });
  });

  // Later documents already begin with their own "---" marker.
  const output = rendered.join("");

  return { ok: true, warnings, output, documents: documents.length, rootType: shape };
}

/** Path of the first value that JSON cannot represent, or null if the value is plain JSON data. */
export function findNonJsonValue(value: unknown, path = "$"): { path: string; reason: string } | null {
  if (typeof value === "number" && !Number.isFinite(value)) return { path, reason: "a number that is not finite (.nan or .inf)" };
  if (typeof value === "bigint") return { path, reason: "an integer too large for JSON" };
  if (typeof value === "undefined" || typeof value === "function" || typeof value === "symbol") return { path, reason: "a value JSON can't hold" };
  if (value instanceof Map || value instanceof Set) return { path, reason: "a mapping with non-text keys" };
  if (value instanceof Date) return { path, reason: "a date object" };

  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const found = findNonJsonValue(value[index], `${path}[${index}]`);
      if (found) return found;
    }
  } else if (typeof value === "object" && value !== null) {
    for (const [key, child] of Object.entries(value)) {
      const found = findNonJsonValue(child, `${path}.${key}`);
      if (found) return found;
    }
  }

  return null;
}

export type YamlToJsonResult = YamlSuccess<{ output: string; documents: number }> | YamlFailure;

export function yamlToJson(yaml: YamlModule, input: string, indent: 2 | 4 = 2): YamlToJsonResult {
  if (input.trim() === "") {
    return { ok: false, issues: [{ message: "Paste or upload YAML to convert it.", line: 1, column: 1 }] };
  }

  const { documents, lineCounter } = parseDocuments(yaml, input);
  const issues = documents.flatMap((document) => [...issuesFrom(document.errors), ...(document.errors.length ? [] : semanticIssues(yaml, document, lineCounter, true))]);

  if (issues.length > 0) return { ok: false, issues };

  const warnings: string[] = [];
  let values: unknown[];

  try {
    values = documents.map((document) => document.toJS({ maxAliasCount: 100 }));
  } catch (error) {
    return { ok: false, issues: [{ message: error instanceof Error ? error.message : "This YAML could not be converted.", line: 1, column: 1 }] };
  }

  for (const value of values) {
    const problem = findNonJsonValue(value);
    if (problem) {
      return { ok: false, issues: [{ message: `${problem.path} is ${problem.reason}, which JSON can't represent.`, line: 1, column: 1 }] };
    }
  }

  if (values.length > 1) {
    warnings.push(`This YAML has ${values.length} documents, so the JSON is an array with one entry per document.`);
  }

  const result = values.length === 1 ? values[0] : values;
  return { ok: true, warnings, output: JSON.stringify(result, null, indent), documents: documents.length };
}

export type JsonToYamlResult = YamlSuccess<{ output: string }> | { ok: false; error: string };

export function jsonToYaml(yaml: YamlModule, input: string, indent: 2 | 4 = 2): JsonToYamlResult {
  if (input.trim() === "") return { ok: false, error: "Paste or upload JSON to convert it." };

  let value: unknown;
  try {
    value = JSON.parse(input);
  } catch (error) {
    return { ok: false, error: `This is not valid JSON: ${error instanceof Error ? error.message : "parse error"}` };
  }

  const warnings: string[] = [];

  if (hasUnsafeIntegers(input)) {
    warnings.push(
      "This JSON contains integers larger than 9,007,199,254,740,991, which browsers cannot represent exactly. Their last digits may have changed; keep such values as strings.",
    );
  }

  return { ok: true, warnings, output: yaml.stringify(value, { indent, lineWidth: 0, indentSeq: true }) };
}
