import * as sqlFormatter from "sql-formatter";
import { describe, expect, it } from "vitest";
import { defaultSqlFormatOptions, formatSql, isWhitespaceOnlyChange, sqlDialects, type SqlFormatOptions } from "./format";

const format = (input: string, overrides: Partial<SqlFormatOptions> = {}) =>
  formatSql(sqlFormatter, input, { ...defaultSqlFormatOptions, ...overrides });

describe("formatSql", () => {
  it("formats a query onto separate lines with upper-case keywords", () => {
    const result = format("select a,b from t where x=1 and y=2");
    expect(result.ok && result.output).toBe("SELECT\n  a,\n  b\nFROM\n  t\nWHERE\n  x = 1\n  AND y = 2");
  });

  it("supports lower-case and preserved keyword case", () => {
    const lower = format("SELECT a FROM t", { keywordCase: "lower" });
    expect(lower.ok && lower.output).toBe("select\n  a\nfrom\n  t");
    const preserved = format("Select a From t", { keywordCase: "preserve" });
    expect(preserved.ok && preserved.output).toBe("Select\n  a\nFrom\n  t");
  });

  it("supports four-space and tab indentation", () => {
    expect(format("select a from t", { indent: "4" }).ok && (format("select a from t", { indent: "4" }) as { output: string }).output).toBe("SELECT\n    a\nFROM\n    t");
    const tabs = format("select a from t", { indent: "tab" });
    expect(tabs.ok && tabs.output).toBe("SELECT\n\ta\nFROM\n\tt");
  });

  it("can place AND/OR at the end of the line", () => {
    const result = format("select a from t where x=1 and y=2", { logicalOperatorNewline: "after" });
    expect(result.ok && result.output).toContain("x = 1 AND\n  y = 2");
  });

  it("separates several statements with the requested number of blank lines", () => {
    const one = format("select 1; select 2;", { linesBetweenQueries: 1 });
    const two = format("select 1; select 2;", { linesBetweenQueries: 2 });
    expect(one.ok && one.output).toContain(";\n\nSELECT");
    expect(two.ok && two.output).toContain(";\n\n\nSELECT");
  });

  it("is idempotent", () => {
    const once = format("select a, b from t left join u on t.id=u.id where x in (1,2,3) order by a desc");
    expect(once.ok).toBe(true);
    if (!once.ok) return;
    const twice = format(once.output);
    expect(twice.ok && twice.output).toBe(once.output);
  });

  it("keeps string literals, quoted identifiers and comments intact", () => {
    const sql = "select 'It''s  a  string' as \"My Col\", -- note\n  b /* block */ from t";
    const result = format(sql);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain("'It''s  a  string'");
    expect(result.output).toContain('"My Col"');
    expect(result.output).toContain("-- note");
    expect(result.output).toContain("/* block */");
    expect(result.warnings).toEqual([]);
  });

  it("understands dialect-specific syntax when the dialect is chosen", () => {
    const pg = format("select data->>'k' as v, x::int from t where a = $1", { language: "postgresql" });
    expect(pg.ok && pg.output).toContain("data ->> 'k'");
    expect(pg.ok && pg.output).toContain("x::int");
    const mysql = format("select `a` from `t` limit 1, 2", { language: "mysql" });
    expect(mysql.ok && mysql.output).toContain("`a`");
    const tsql = format("select [a] from [dbo].[t]", { language: "transactsql" });
    expect(tsql.ok && tsql.output).toContain("[dbo].[t]");
  });

  it("returns an empty result for empty input", () => {
    expect(format("   ")).toEqual({ ok: true, output: "", warnings: [] });
  });
});

describe("formatSql errors", () => {
  it("reports an unterminated string with a position and a short message", () => {
    const result = format("select 'abc from t");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.line).toBe(1);
    expect(result.column).toBe(8);
    expect(result.error).not.toContain("\n");
    expect(result.error).toMatch(/Unexpected/);
  });

  it("reports an incomplete statement", () => {
    const result = format("select * from (");
    expect(result.ok).toBe(false);
    expect(!result.ok && result.line).toBe(1);
  });
});

describe("isWhitespaceOnlyChange", () => {
  it("accepts spacing changes and, when allowed, case changes", () => {
    expect(isWhitespaceOnlyChange("select a,b", "select\n  a,\n  b", false)).toBe(true);
    expect(isWhitespaceOnlyChange("select a", "SELECT a", false)).toBe(false);
    expect(isWhitespaceOnlyChange("select a", "SELECT a", true)).toBe(true);
  });

  it("rejects changed content", () => {
    expect(isWhitespaceOnlyChange("select a", "select b", true)).toBe(false);
    expect(isWhitespaceOnlyChange("where x=1", "where x=2", true)).toBe(false);
  });
});

describe("dialect list", () => {
  it("only offers dialects the installed library supports", () => {
    for (const dialect of sqlDialects) expect(sqlFormatter.supportedDialects).toContain(dialect.value);
    expect(new Set(sqlDialects.map((dialect) => dialect.value)).size).toBe(sqlDialects.length);
  });
});
