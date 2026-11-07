/**
 * SQL formatting on top of `sql-formatter` (MIT). The package is passed in so the browser can load
 * it lazily while tests use it directly. Formatting should only change whitespace and, if asked,
 * the case of keywords; `isWhitespaceOnlyChange` checks that and the tool warns when it doesn't hold.
 */

type SqlFormatterModule = typeof import("sql-formatter");

export type SqlDialect = import("sql-formatter").SqlLanguage;

export const sqlDialects: Array<{ value: SqlDialect; label: string }> = [
  { value: "sql", label: "Standard SQL" },
  { value: "postgresql", label: "PostgreSQL" },
  { value: "mysql", label: "MySQL" },
  { value: "mariadb", label: "MariaDB" },
  { value: "sqlite", label: "SQLite" },
  { value: "transactsql", label: "SQL Server (T-SQL)" },
  { value: "plsql", label: "Oracle (PL/SQL)" },
  { value: "bigquery", label: "BigQuery" },
  { value: "snowflake", label: "Snowflake" },
  { value: "redshift", label: "Amazon Redshift" },
  { value: "spark", label: "Spark SQL" },
  { value: "hive", label: "Hive" },
  { value: "trino", label: "Trino" },
  { value: "db2", label: "IBM Db2" },
  { value: "duckdb", label: "DuckDB" },
  { value: "clickhouse", label: "ClickHouse" },
];

export type SqlFormatOptions = {
  language: SqlDialect;
  keywordCase: "upper" | "lower" | "preserve";
  indent: "2" | "4" | "tab";
  linesBetweenQueries: 1 | 2;
  /** Put AND / OR at the start of the line ("before") or the end ("after"). */
  logicalOperatorNewline: "before" | "after";
};

export const defaultSqlFormatOptions: SqlFormatOptions = {
  language: "sql",
  keywordCase: "upper",
  indent: "2",
  linesBetweenQueries: 1,
  logicalOperatorNewline: "before",
};

export type SqlFormatResult =
  | { ok: true; output: string; warnings: string[] }
  | { ok: false; error: string; line?: number; column?: number };

/** True if `formatted` differs from `original` only by whitespace (and letter case when `ignoreCase`). */
export function isWhitespaceOnlyChange(original: string, formatted: string, ignoreCase: boolean): boolean {
  const squeeze = (text: string) => {
    const squeezed = text.replace(/\s+/g, "");
    return ignoreCase ? squeezed.toLowerCase() : squeezed;
  };

  return squeeze(original) === squeeze(formatted);
}

export function formatSql(sqlFormatter: SqlFormatterModule, input: string, options: SqlFormatOptions = defaultSqlFormatOptions): SqlFormatResult {
  if (input.trim() === "") return { ok: true, output: "", warnings: [] };

  try {
    const output = sqlFormatter.format(input, {
      language: options.language,
      keywordCase: options.keywordCase,
      useTabs: options.indent === "tab",
      tabWidth: options.indent === "4" ? 4 : 2,
      linesBetweenQueries: options.linesBetweenQueries,
      logicalOperatorNewline: options.logicalOperatorNewline,
    });

    const warnings: string[] = [];

    if (!isWhitespaceOnlyChange(input, output, options.keywordCase !== "preserve")) {
      warnings.push(
        "The formatted text differs from your input by more than spacing and keyword case. Compare it with the original before using it.",
      );
    }

    return { ok: true, output, warnings };
  } catch (error) {
    const raw = error instanceof Error ? error.message : "This SQL could not be formatted.";
    const position = /line (\d+) column (\d+)/.exec(raw);
    // The library appends dialect hints on following lines; the first line is the actual problem.
    const message = raw.split("\n")[0].replace(/^Parse error:?\s*/, "").replace(/ at line \d+ column \d+\.?$/, "").trim();

    return {
      ok: false,
      error: message || "This SQL could not be parsed.",
      line: position ? Number(position[1]) : undefined,
      column: position ? Number(position[2]) : undefined,
    };
  }
}
