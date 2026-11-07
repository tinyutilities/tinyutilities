"use client";

import { useDeferredValue, useId, useMemo, useRef, useState } from "react";
import {
  Button,
  ChoiceGroup,
  CheckboxField,
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
import { defaultYamlFormatOptions, formatYaml, jsonToYaml, yamlToJson, type YamlIssue } from "@/lib/yaml/yaml";

type Mode = "format" | "to-json" | "to-yaml";

const modeOptions: Array<{ value: Mode; label: string }> = [
  { value: "format", label: "Format & validate YAML" },
  { value: "to-json", label: "YAML → JSON" },
  { value: "to-yaml", label: "JSON → YAML" },
];

const indentOptions: Array<{ value: "2" | "4"; label: string }> = [
  { value: "2", label: "2 spaces" },
  { value: "4", label: "4 spaces" },
];

const widthOptions: Array<{ value: "0" | "80" | "120"; label: string }> = [
  { value: "0", label: "Don't re-wrap long lines" },
  { value: "80", label: "Wrap at 80 characters" },
  { value: "120", label: "Wrap at 120 characters" },
];

const maxFileBytes = 5 * 1024 * 1024;

type Outcome =
  | { ok: true; output: string; warnings: string[]; summary: string }
  | { ok: false; issues: YamlIssue[] };

const loadYaml = () => import("yaml");

export function YamlFormatterTool() {
  const inputId = useId();
  const outputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { module: yaml, error: loadFailed } = useLazyModule(loadYaml);

  const [mode, setMode] = useState<Mode>("format");
  const [input, setInput] = useState("");
  const [indent, setIndent] = useState<"2" | "4">("2");
  const [sortKeys, setSortKeys] = useState(false);
  const [lineWidth, setLineWidth] = useState<"0" | "80" | "120">("0");
  const [fileMessage, setFileMessage] = useState<string | null>(null);
  const [outputName, setOutputName] = useState("TinyUtility-formatted");

  const deferredInput = useDeferredValue(input);

  const outcome: Outcome | null = useMemo(() => {
    if (!yaml || !deferredInput.trim()) return null;

    if (mode === "format") {
      const result = formatYaml(yaml, deferredInput, {
        ...defaultYamlFormatOptions,
        indent: indent === "4" ? 4 : 2,
        sortKeys,
        lineWidth: Number(lineWidth) as 0 | 80 | 120,
      });
      if (!result.ok) return result;
      const documents = `${result.documents} document${result.documents === 1 ? "" : "s"}`;
      return { ok: true, output: result.output, warnings: result.warnings, summary: `Valid YAML · ${documents} · top level: ${result.rootType}` };
    }

    if (mode === "to-json") {
      const result = yamlToJson(yaml, deferredInput, indent === "4" ? 4 : 2);
      return result.ok ? { ok: true, output: result.output, warnings: result.warnings, summary: "Converted to JSON" } : result;
    }

    const result = jsonToYaml(yaml, deferredInput, indent === "4" ? 4 : 2);
    return result.ok
      ? { ok: true, output: result.output, warnings: result.warnings, summary: "Converted to YAML" }
      : { ok: false, issues: [{ message: result.error, line: 1, column: 1 }] };
  }, [yaml, deferredInput, mode, indent, sortKeys, lineWidth]);

  const extension = mode === "to-json" ? "json" : "yaml";
  const lines = deferredInput.split(/\r\n|\r|\n/);

  const changeMode = (next: Mode) => {
    setMode(next);
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
      setOutputName(file.name.replace(/\.[^.]+$/, "") || "formatted");
      setFileMessage(`Loaded ${file.name} (${formatBytes(file.size)}).`);
    } catch {
      setFileMessage("This file could not be read as text.");
    }
  };

  return (
    <section className="mt-16 space-y-6">
      <PrivacyNote>Your YAML never leaves your device. It is parsed and formatted entirely in your browser.</PrivacyNote>

      <Panel>
        <ChoiceGroup legend="What do you want to do?" onChange={changeMode} options={modeOptions} value={mode} />
      </Panel>

      <Panel>
        <PanelLabel htmlFor={inputId} meta={`${input.length.toLocaleString()} characters`}>
          {mode === "to-yaml" ? "JSON input" : "YAML input"}
        </PanelLabel>
        <TextArea
          aria-describedby={outcome && !outcome.ok ? `${inputId}-errors` : undefined}
          id={inputId}
          onChange={(event) => setInput(event.target.value)}
          placeholder={mode === "to-yaml" ? '{"name": "app", "ports": [80, 443]}' : "name: app\nports:\n  - 80\n  - 443"}
          value={input}
        />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            accept={mode === "to-yaml" ? ".json,application/json,text/plain" : ".yaml,.yml,text/yaml,text/plain"}
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
          <SelectField id={`${inputId}-indent`} label="Indentation" onChange={setIndent} options={indentOptions} value={indent} />
          {mode === "format" ? (
            <>
              <SelectField id={`${inputId}-width`} label="Long lines" onChange={setLineWidth} options={widthOptions} value={lineWidth} />
              <CheckboxField checked={sortKeys} hint="Orders keys A–Z at every level; comments stay with their keys" onChange={setSortKeys}>
                Sort mapping keys
              </CheckboxField>
            </>
          ) : null}
        </div>
        {loadFailed ? (
          <p className="mt-4 text-sm text-red-300" role="alert">
            The YAML engine could not be loaded. Check your connection and reload the page.
          </p>
        ) : null}
      </Panel>

      {outcome && !outcome.ok ? (
        <Panel>
          <div id={`${inputId}-errors`} role="alert">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-red-300">
              {outcome.issues.length === 1 ? "1 problem found" : `${outcome.issues.length} problems found`}
            </h3>
            <ul className="mt-3 space-y-3">
              {outcome.issues.map((issue, index) => (
                <li className="rounded-2xl border border-red-300/20 bg-red-300/[0.06] p-4" key={`${issue.line}-${issue.column}-${index}`}>
                  <p className="text-sm text-red-100">
                    <strong>
                      Line {issue.line}, column {issue.column}:
                    </strong>{" "}
                    {issue.message}
                  </p>
                  {mode !== "to-yaml" && lines[issue.line - 1] !== undefined ? (
                    <pre className="mt-2 overflow-x-auto rounded-lg bg-[#080b1a]/80 p-3 font-mono text-xs text-slate-200">
                      {lines[issue.line - 1] || " "}
                    </pre>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </Panel>
      ) : null}

      {outcome?.ok ? (
        <Panel>
          <PanelLabel htmlFor={outputId} meta={outcome.summary}>
            {mode === "to-json" ? "JSON output" : "YAML output"}
          </PanelLabel>
          <TextArea id={outputId} readOnly value={outcome.output} />

          {outcome.warnings.length > 0 ? (
            <div className="mt-4">
              <WarningNote>
                <ul className="list-disc space-y-1 pl-5">
                  {outcome.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </WarningNote>
            </div>
          ) : null}

          <div className="mt-4 max-w-md">
            <FilenameField extension={extension} onChange={setOutputName} value={outputName} />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <CopyButton text={outcome.output} />
            <Button
              onClick={() =>
                downloadText(
                  outcome.output,
                  buildDownloadFilename(outputName, extension, "TinyUtility-formatted"),
                  extension === "json" ? "application/json" : "application/yaml",
                )
              }
              variant="primary"
            >
              Download .{extension}
            </Button>
            <Button onClick={() => setInput(outcome.output)} variant="neutral">
              Use result as input
            </Button>
          </div>
        </Panel>
      ) : null}

      <InfoNote>
        Formatting keeps comments, anchors and quoting styles. YAML 1.2 rules apply, so values like <code className="font-mono text-xs">yes</code>{" "}
        and <code className="font-mono text-xs">on</code> are text, not booleans. Converting to JSON loses comments (JSON has none), and
        values JSON can&apos;t represent are reported instead of changed.
      </InfoNote>
    </section>
  );
}
