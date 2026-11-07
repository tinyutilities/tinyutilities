"use client";

import { useDeferredValue, useId, useMemo, useRef, useState } from "react";
import {
  Button,
  ChoiceGroup,
  CheckboxField,
  CopyButton,
  ErrorMessage,
  Panel,
  PanelLabel,
  PrivacyNote,
  SelectField,
  TextArea,
  WarningNote,
} from "@/components/tools/tool-ui";
import { buildDownloadFilename, FilenameField, formatBytes } from "@/components/upload";
import { downloadText } from "@/lib/browser/download";
import { csvToJson, jsonToCsv, type CsvToJsonOptions, type JsonToCsvOptions } from "@/lib/csv/convert";
import { delimiterLabels, type Delimiter } from "@/lib/csv/csv";

type Direction = "csv-to-json" | "json-to-csv";

const directionOptions: Array<{ value: Direction; label: string }> = [
  { value: "csv-to-json", label: "CSV → JSON" },
  { value: "json-to-csv", label: "JSON → CSV" },
];

const maxFileBytes = 10 * 1024 * 1024;

const csvDelimiterOptions: Array<{ value: Delimiter | "auto"; label: string }> = [
  { value: "auto", label: "Auto-detect" },
  ...delimiterLabels,
];

const nestedOptions: Array<{ value: JsonToCsvOptions["nested"]; label: string }> = [
  { value: "error", label: "Stop with an error" },
  { value: "stringify", label: "Write nested values as JSON text" },
];

const indentOptions: Array<{ value: "2" | "4"; label: string }> = [
  { value: "2", label: "2 spaces" },
  { value: "4", label: "4 spaces" },
];

export function JsonCsvConverterTool() {
  const inputId = useId();
  const outputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [direction, setDirection] = useState<Direction>("csv-to-json");
  const [input, setInput] = useState("");
  const [fileMessage, setFileMessage] = useState<string | null>(null);
  const [outputName, setOutputName] = useState("TinyUtility-converted");

  const [csvDelimiter, setCsvDelimiter] = useState<Delimiter | "auto">("auto");
  const [hasHeader, setHasHeader] = useState(true);
  const [inferTypes, setInferTypes] = useState(false);
  const [indent, setIndent] = useState<"2" | "4">("2");

  const [outDelimiter, setOutDelimiter] = useState<Delimiter>(",");
  const [nested, setNested] = useState<JsonToCsvOptions["nested"]>("error");
  const [addBom, setAddBom] = useState(false);

  // Converting very large input on every keystroke would stall typing; let React lag behind it.
  const deferredInput = useDeferredValue(input);

  const result = useMemo(() => {
    if (!deferredInput.trim()) return null;

    if (direction === "csv-to-json") {
      const options: CsvToJsonOptions = {
        delimiter: csvDelimiter,
        hasHeader,
        inferTypes,
        indent: indent === "4" ? 4 : 2,
      };
      const converted = csvToJson(deferredInput, options);
      return converted.ok
        ? { ok: true as const, text: converted.json, warnings: converted.warnings, summary: `${converted.rowCount.toLocaleString()} record${converted.rowCount === 1 ? "" : "s"}${csvDelimiter === "auto" ? ` · delimiter detected: ${converted.delimiter === "\t" ? "tab" : converted.delimiter}` : ""}` }
        : converted;
    }

    const converted = jsonToCsv(deferredInput, { delimiter: outDelimiter, nested });
    return converted.ok
      ? { ok: true as const, text: converted.csv, warnings: converted.warnings, summary: `${converted.rowCount.toLocaleString()} row${converted.rowCount === 1 ? "" : "s"} · ${converted.columns.length.toLocaleString()} column${converted.columns.length === 1 ? "" : "s"}` }
      : converted;
  }, [deferredInput, direction, csvDelimiter, hasHeader, inferTypes, indent, outDelimiter, nested]);

  const extension = direction === "csv-to-json" ? "json" : "csv";

  const changeDirection = (next: Direction) => {
    setDirection(next);
    setInput("");
    setFileMessage(null);
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;

    if (file.size > maxFileBytes) {
      setFileMessage(`This file is ${formatBytes(file.size)}. Files are limited to ${formatBytes(maxFileBytes)}.`);
      return;
    }

    try {
      setInput(await file.text());
      setOutputName(`${file.name.replace(/\.[^.]+$/, "") || "converted"}`);
      setFileMessage(`Loaded ${file.name} (${formatBytes(file.size)}).`);
    } catch {
      setFileMessage("This file could not be read as text.");
    }
  };

  return (
    <section className="mt-16 space-y-6">
      <PrivacyNote>Your data never leaves your device. Conversion happens entirely in your browser.</PrivacyNote>

      <Panel>
        <ChoiceGroup legend="Convert" onChange={changeDirection} options={directionOptions} value={direction} />
      </Panel>

      <Panel>
        <PanelLabel htmlFor={inputId} meta={`${input.length.toLocaleString()} characters`}>
          {direction === "csv-to-json" ? "CSV input" : "JSON input"}
        </PanelLabel>
        <TextArea
          id={inputId}
          onChange={(event) => setInput(event.target.value)}
          placeholder={
            direction === "csv-to-json"
              ? "Paste CSV here, or load a file."
              : 'Paste JSON here, such as [{"name": "Ada", "age": 36}], or load a file.'
          }
          value={input}
        />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            accept={direction === "csv-to-json" ? ".csv,.tsv,.txt,text/csv,text/plain" : ".json,application/json,text/plain"}
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
          {direction === "csv-to-json" ? (
            <>
              <SelectField
                id={`${inputId}-delimiter`}
                label="Delimiter"
                onChange={setCsvDelimiter}
                options={csvDelimiterOptions}
                value={csvDelimiter}
              />
              <SelectField id={`${inputId}-indent`} label="JSON indentation" onChange={setIndent} options={indentOptions} value={indent} />
              <CheckboxField checked={hasHeader} hint="Otherwise the output is an array of arrays" onChange={setHasHeader}>
                First row is a header
              </CheckboxField>
              <CheckboxField
                checked={inferTypes}
                hint="Only values that print back exactly as written (not 007 or 1.50)"
                onChange={setInferTypes}
              >
                Convert numbers and true/false
              </CheckboxField>
            </>
          ) : (
            <>
              <SelectField
                id={`${inputId}-out-delimiter`}
                label="Delimiter"
                onChange={setOutDelimiter}
                options={delimiterLabels}
                value={outDelimiter}
              />
              <div className="sm:col-span-2">
                <ChoiceGroup legend="Nested objects and arrays" onChange={setNested} options={nestedOptions} value={nested} />
              </div>
            </>
          )}
        </div>
      </Panel>

      {result && !result.ok ? (
        <Panel>
          <ErrorMessage>{result.error}</ErrorMessage>
        </Panel>
      ) : null}

      {result?.ok ? (
        <Panel>
          <PanelLabel htmlFor={outputId} meta={result.summary}>
            {direction === "csv-to-json" ? "JSON output" : "CSV output"}
          </PanelLabel>
          <TextArea id={outputId} readOnly value={result.text} />

          {result.warnings.length > 0 ? (
            <div className="mt-4">
              <WarningNote>
                <ul className="list-disc space-y-1 pl-5">
                  {result.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </WarningNote>
            </div>
          ) : null}

          <div className="mt-4 max-w-md">
            <FilenameField extension={extension} onChange={setOutputName} value={outputName} />
          </div>
          {direction === "json-to-csv" ? (
            <div className="mt-4">
              <CheckboxField
                checked={addBom}
                hint="Helps Excel on Windows show accented and non-Latin characters correctly"
                onChange={setAddBom}
              >
                Add a UTF-8 byte order mark to the downloaded file
              </CheckboxField>
            </div>
          ) : null}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <CopyButton text={result.text} />
            <Button
              onClick={() =>
                downloadText(
                  result.text,
                  buildDownloadFilename(outputName, extension, "TinyUtility-converted"),
                  direction === "csv-to-json" ? "application/json" : "text/csv",
                  direction === "json-to-csv" && addBom,
                )
              }
              variant="primary"
            >
              Download .{extension}
            </Button>
          </div>
        </Panel>
      ) : null}
    </section>
  );
}
