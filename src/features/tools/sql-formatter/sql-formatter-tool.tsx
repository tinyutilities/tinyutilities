"use client";

import { useDeferredValue, useId, useMemo, useRef, useState } from "react";
import {
  Button,
  ChoiceGroup,
  CopyButton,
  InfoNote,
  Panel,
  PanelLabel,
  PrivacyNote,
  SelectField,
  TextArea,
  WarningNote,
} from "@/components/tools/tool-ui";
import { buildDownloadFilename, FilenameField, formatBytes } from "@/components/upload";
import { downloadText } from "@/lib/browser/download";
import { useLazyModule } from "@/lib/browser/use-lazy-module";
import { defaultSqlFormatOptions, formatSql, sqlDialects, type SqlDialect, type SqlFormatOptions } from "@/lib/sql/format";

const keywordCaseOptions: Array<{ value: SqlFormatOptions["keywordCase"]; label: string }> = [
  { value: "upper", label: "UPPERCASE" },
  { value: "lower", label: "lowercase" },
  { value: "preserve", label: "Keep as typed" },
];

const indentOptions: Array<{ value: SqlFormatOptions["indent"]; label: string }> = [
  { value: "2", label: "2 spaces" },
  { value: "4", label: "4 spaces" },
  { value: "tab", label: "Tab" },
];

const blankLineOptions: Array<{ value: "1" | "2"; label: string }> = [
  { value: "1", label: "1 blank line" },
  { value: "2", label: "2 blank lines" },
];

const logicalOptions: Array<{ value: SqlFormatOptions["logicalOperatorNewline"]; label: string }> = [
  { value: "before", label: "Start of the line" },
  { value: "after", label: "End of the line" },
];

const maxFileBytes = 5 * 1024 * 1024;
const loadSqlFormatter = () => import("sql-formatter");

export function SqlFormatterTool() {
  const inputId = useId();
  const outputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { module: sqlFormatter, error: loadFailed } = useLazyModule(loadSqlFormatter);

  const [input, setInput] = useState("");
  const [options, setOptions] = useState<SqlFormatOptions>(defaultSqlFormatOptions);
  const [fileMessage, setFileMessage] = useState<string | null>(null);
  const [outputName, setOutputName] = useState("TinyUtility-formatted");

  const deferredInput = useDeferredValue(input);
  const update = <K extends keyof SqlFormatOptions>(key: K, value: SqlFormatOptions[K]) =>
    setOptions((current) => ({ ...current, [key]: value }));

  const result = useMemo(
    () => (sqlFormatter && deferredInput.trim() ? formatSql(sqlFormatter, deferredInput, options) : null),
    [sqlFormatter, deferredInput, options],
  );

  const lines = deferredInput.split(/\r\n|\r|\n/);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;

    if (file.size > maxFileBytes) {
      setFileMessage(`This file is ${formatBytes(file.size)}. Files are limited to ${formatBytes(maxFileBytes)}.`);
      return;
    }

    try {
      setInput(await file.text());
      setOutputName(file.name.replace(/\.[^.]+$/, "") || "formatted");
      setFileMessage(`Loaded ${file.name} (${formatBytes(file.size)}).`);
    } catch {
      setFileMessage("This file could not be read as text.");
    }
  };

  return (
    <section className="mt-16 space-y-6">
      <PrivacyNote>Your SQL never leaves your device. It is formatted entirely in your browser; it is never run against a database.</PrivacyNote>

      <Panel>
        <PanelLabel htmlFor={inputId} meta={`${input.length.toLocaleString()} characters`}>
          SQL input
        </PanelLabel>
        <TextArea
          aria-describedby={result && !result.ok ? `${inputId}-error` : undefined}
          id={inputId}
          onChange={(event) => setInput(event.target.value)}
          placeholder="select id, name from users where active = 1 order by name"
          value={input}
        />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            accept=".sql,text/plain"
            className="sr-only"
            onChange={(event) => {
              void handleFile(event.target.files?.[0]);
              event.target.value = "";
            }}
            ref={fileInputRef}
            tabIndex={-1}
            type="file"
          />
          <Button onClick={() => fileInputRef.current?.click()}>Load from file</Button>
          <Button disabled={!input} onClick={() => setInput("")} variant="danger">
            Clear
          </Button>
          {fileMessage ? (
            <span className="text-xs text-slate-400" role="status">
              {fileMessage}
            </span>
          ) : null}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <SelectField
            id={`${inputId}-dialect`}
            label="SQL dialect"
            onChange={(value: SqlDialect) => update("language", value)}
            options={sqlDialects}
            value={options.language}
          />
          <SelectField id={`${inputId}-indent`} label="Indentation" onChange={(value) => update("indent", value)} options={indentOptions} value={options.indent} />
          <SelectField
            id={`${inputId}-blank`}
            label="Between statements"
            onChange={(value) => update("linesBetweenQueries", value === "2" ? 2 : 1)}
            options={blankLineOptions}
            value={String(options.linesBetweenQueries) as "1" | "2"}
          />
          <div className="sm:col-span-2">
            <ChoiceGroup legend="Keywords" onChange={(value) => update("keywordCase", value)} options={keywordCaseOptions} value={options.keywordCase} />
          </div>
          <div className="sm:col-span-2">
            <ChoiceGroup
              legend="Put AND / OR at the"
              onChange={(value) => update("logicalOperatorNewline", value)}
              options={logicalOptions}
              value={options.logicalOperatorNewline}
            />
          </div>
        </div>
        {loadFailed ? (
          <p className="mt-4 text-sm text-red-300" role="alert">
            The SQL formatter could not be loaded. Check your connection and reload the page.
          </p>
        ) : null}
      </Panel>

      {result && !result.ok ? (
        <Panel>
          <div id={`${inputId}-error`} role="alert">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-red-300">This SQL could not be formatted</h3>
            <div className="mt-3 rounded-2xl border border-red-300/20 bg-red-300/[0.06] p-4">
              <p className="text-sm text-red-100">
                {result.line ? (
                  <strong>
                    Line {result.line}, column {result.column}:{" "}
                  </strong>
                ) : null}
                {result.error}
              </p>
              {result.line && lines[result.line - 1] !== undefined ? (
                <pre className="mt-2 overflow-x-auto rounded-lg bg-[#080b1a]/80 p-3 font-mono text-xs text-slate-200">{lines[result.line - 1] || " "}</pre>
              ) : null}
              {options.language === "sql" ? (
                <p className="mt-2 text-xs text-red-100/80">
                  Standard SQL doesn&apos;t cover vendor-specific syntax. If this query uses features of a particular database, choose that dialect above.
                </p>
              ) : null}
            </div>
          </div>
        </Panel>
      ) : null}

      {result?.ok ? (
        <Panel>
          <PanelLabel htmlFor={outputId} meta={`${result.output.split("\n").length.toLocaleString()} lines`}>
            Formatted SQL
          </PanelLabel>
          <TextArea id={outputId} readOnly value={result.output} />

          {result.warnings.length > 0 ? (
            <div className="mt-4">
              <WarningNote>{result.warnings.join(" ")}</WarningNote>
            </div>
          ) : null}

          <div className="mt-4 max-w-md">
            <FilenameField extension="sql" onChange={setOutputName} value={outputName} />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <CopyButton text={result.output} />
            <Button
              onClick={() => downloadText(result.output, buildDownloadFilename(outputName, "sql", "TinyUtility-formatted"), "application/sql")}
              variant="primary"
            >
              Download .sql
            </Button>
          </div>
        </Panel>
      ) : null}

      <InfoNote>
        This tool only changes spacing, line breaks and (if you choose) keyword case; it doesn&apos;t validate your query against a database
        or check that table and column names exist. If the result differs in any other way, you&apos;ll see a warning. Formatting is not a
        security measure: never build queries by pasting untrusted values into SQL.
      </InfoNote>
    </section>
  );
}
