"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type ValidationState = {
  isValid: boolean;
  message: string;
  line?: number;
  column?: number;
};

type Indentation = 2 | 4;

const validationDelayMs = 150;

const emptyValidation: ValidationState = {
  isValid: false,
  message: "Paste or type JSON to validate it.",
};

function copyWithFallback(value: string) {
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    return document.execCommand("copy");
  } finally {
    document.body.removeChild(textarea);
  }
}

function getJsonErrorPosition(message: string) {
  const positionMatch = message.match(/position\s+(\d+)/i);

  if (!positionMatch) {
    return null;
  }

  return Number(positionMatch[1]);
}

function getLineColumn(value: string, position: number) {
  let line = 1;
  let column = 1;

  for (let index = 0; index < Math.min(position, value.length); index += 1) {
    const code = value.charCodeAt(index);
    const nextCode = index + 1 < value.length ? value.charCodeAt(index + 1) : 0;

    if (code === 10 || (code === 13 && nextCode !== 10)) {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }

  return { line, column };
}

function validateJson(value: string): ValidationState {
  if (!value.trim()) {
    return emptyValidation;
  }

  try {
    JSON.parse(value);

    return {
      isValid: true,
      message: "Valid JSON",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid JSON";
    const position = getJsonErrorPosition(message);
    const location = position === null ? null : getLineColumn(value, position);

    return {
      isValid: false,
      message,
      line: location?.line,
      column: location?.column,
    };
  }
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en").format(value);
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${formatNumber(bytes)} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getLineCount(value: string) {
  if (!value) {
    return 0;
  }

  let lines = 1;

  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    const nextCode = index + 1 < value.length ? value.charCodeAt(index + 1) : 0;

    if (code === 10 || (code === 13 && nextCode !== 10)) {
      lines += 1;
    }
  }

  return lines;
}

function getDownloadName(fileName: string | null) {
  if (!fileName) {
    return "formatted.json";
  }

  const baseName = fileName.replace(/\.json$/i, "") || "formatted";

  return `${baseName}-formatted.json`;
}

function downloadJson(value: string, fileName: string | null) {
  const blob = new Blob([value], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.download = getDownloadName(fileName);
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

export function JsonFormatterTool() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const copyTimeoutRef = useRef<number | null>(null);
  const [jsonText, setJsonText] = useState("");
  const [debouncedJsonText, setDebouncedJsonText] = useState("");
  const [indentation, setIndentation] = useState<Indentation>(2);
  const [sourceFileName, setSourceFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [copyLabel, setCopyLabel] = useState("Copy JSON");
  const [actionMessage, setActionMessage] = useState("Format, minify, or validate when you are ready.");

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedJsonText(jsonText);
    }, validationDelayMs);

    return () => window.clearTimeout(timeout);
  }, [jsonText]);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current !== null) {
        window.clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const validation = useMemo(() => validateJson(debouncedJsonText), [debouncedJsonText]);
  const canUseJson = jsonText.trim().length > 0 && validation.isValid;

  const stats = useMemo(
    () => ({
      characters: jsonText.length,
      lines: getLineCount(jsonText),
      bytes: new Blob([jsonText]).size,
    }),
    [jsonText],
  );

  const updateEditorValue = useCallback((nextValue: string, message: string) => {
    const editor = editorRef.current;
    const previousSelectionStart = editor?.selectionStart ?? nextValue.length;

    setJsonText(nextValue);
    setDebouncedJsonText(nextValue);
    setActionMessage(message);

    window.requestAnimationFrame(() => {
      const nextEditor = editorRef.current;

      if (!nextEditor) {
        return;
      }

      const nextSelection = Math.min(previousSelectionStart, nextValue.length);
      nextEditor.focus();
      nextEditor.setSelectionRange(nextSelection, nextSelection);
    });
  }, []);

  const formatJson = useCallback(() => {
    try {
      const parsedJson = JSON.parse(jsonText);
      updateEditorValue(JSON.stringify(parsedJson, null, indentation), "JSON formatted.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid JSON";
      setActionMessage(`Cannot format invalid JSON. ${message}`);
    }
  }, [indentation, jsonText, updateEditorValue]);

  const minifyJson = useCallback(() => {
    try {
      const parsedJson = JSON.parse(jsonText);
      updateEditorValue(JSON.stringify(parsedJson), "JSON minified.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid JSON";
      setActionMessage(`Cannot minify invalid JSON. ${message}`);
    }
  }, [jsonText, updateEditorValue]);

  const validateCurrentJson = useCallback(() => {
    const nextValidation = validateJson(jsonText);
    setDebouncedJsonText(jsonText);
    setActionMessage(
      nextValidation.isValid
        ? "JSON is valid."
        : `JSON is invalid. ${nextValidation.message}`,
    );
  }, [jsonText]);

  const handleCopy = useCallback(async () => {
    if (!canUseJson) {
      return;
    }

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(jsonText);
      } else if (!copyWithFallback(jsonText)) {
        throw new Error("Fallback copy failed.");
      }

      setCopyLabel("Copied ✓");
      setActionMessage("JSON copied to clipboard.");

      if (copyTimeoutRef.current !== null) {
        window.clearTimeout(copyTimeoutRef.current);
      }

      copyTimeoutRef.current = window.setTimeout(() => {
        setCopyLabel("Copy JSON");
      }, 1400);
    } catch {
      setActionMessage("Could not copy JSON. Select it manually instead.");
    }
  }, [canUseJson, jsonText]);

  const handleDownload = useCallback(() => {
    if (!canUseJson) {
      return;
    }

    downloadJson(jsonText, sourceFileName);
    setActionMessage("JSON file downloaded.");
  }, [canUseJson, jsonText, sourceFileName]);

  const handleClear = useCallback(() => {
    setJsonText("");
    setDebouncedJsonText("");
    setSourceFileName(null);
    setCopyLabel("Copy JSON");
    setActionMessage("Format, minify, or validate when you are ready.");
  }, []);

  const handleFile = useCallback((file: File | undefined) => {
    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith(".json")) {
      setActionMessage("Please choose a .json file.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const nextText = typeof reader.result === "string" ? reader.result : "";

      setJsonText(nextText);
      setDebouncedJsonText(nextText);
      setSourceFileName(file.name);
      setActionMessage(`${file.name} loaded locally.`);
    };
    reader.onerror = () => {
      setActionMessage("Could not read that JSON file.");
    };
    reader.readAsText(file);
  }, []);

  const validationDetails =
    validation.line && validation.column
      ? `Line ${validation.line}, column ${validation.column}`
      : null;

  return (
    <section className="mt-16 space-y-6">
      <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-5 text-sm font-medium leading-6 text-cyan-100">
        Your JSON never leaves your browser. Formatting and validation happen entirely on your device.
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_21rem]">
        <div
          className={`rounded-3xl border bg-white/[0.04] p-5 shadow-2xl shadow-black/20 transition sm:p-8 ${
            isDragging ? "border-cyan-300/60" : "border-white/10"
          }`}
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(event) => {
            if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
              return;
            }

            setIsDragging(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            handleFile(event.dataTransfer.files[0]);
          }}
        >
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
            <div>
              <label className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300" htmlFor="json-editor">
                JSON editor
              </label>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Paste, type, upload, or drop a .json file.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                className="rounded-full bg-gradient-to-r from-[#4F46E5] via-[#06B6D4] to-[#14B8A6] px-5 py-2.5 text-sm font-semibold text-white shadow-xl shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:shadow-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                disabled={!jsonText.trim()}
                onClick={formatJson}
                type="button"
              >
                Format JSON
              </button>
              <button
                className="rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                disabled={!jsonText.trim()}
                onClick={minifyJson}
                type="button"
              >
                Minify JSON
              </button>
              <button
                className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-5 py-2.5 text-sm font-semibold text-cyan-100 transition hover:-translate-y-0.5 hover:border-cyan-200/50 hover:bg-cyan-300/15 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                disabled={!jsonText.trim()}
                onClick={validateCurrentJson}
                type="button"
              >
                Validate JSON
              </button>
            </div>
          </div>

          <div className="mt-5 flex flex-col justify-between gap-4 rounded-2xl border border-white/10 bg-[#080b1a]/70 p-4 sm:flex-row sm:items-center">
            <fieldset className="flex flex-wrap items-center gap-3">
              <legend className="sr-only">Indentation</legend>
              <span className="text-sm font-semibold text-slate-300">Indent</span>
              {[2, 4].map((spaces) => (
                <label
                  className="flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-300/30"
                  key={spaces}
                >
                  <input
                    checked={indentation === spaces}
                    className="size-4 accent-cyan-300"
                    onChange={() => setIndentation(spaces as Indentation)}
                    type="radio"
                  />
                  {spaces} spaces
                </label>
              ))}
            </fieldset>

            <div className="flex flex-wrap gap-3">
              <button
                className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/10"
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                Upload JSON
              </button>
              <button
                className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:-translate-y-0.5 hover:border-cyan-200/50 hover:bg-cyan-300/15 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                disabled={!canUseJson}
                onClick={handleCopy}
                type="button"
              >
                {copyLabel}
              </button>
              <button
                className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                disabled={!canUseJson}
                onClick={handleDownload}
                type="button"
              >
                Download JSON
              </button>
              <button
                className="rounded-full border border-red-300/25 bg-red-300/10 px-4 py-2 text-sm font-semibold text-red-100 transition hover:-translate-y-0.5 hover:border-red-200/50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                disabled={!jsonText}
                onClick={handleClear}
                type="button"
              >
                Clear
              </button>
              <input
                accept=".json,application/json"
                className="sr-only"
                onChange={(event) => {
                  handleFile(event.target.files?.[0]);
                  event.target.value = "";
                }}
                ref={fileInputRef}
                type="file"
              />
            </div>
          </div>

          <textarea
            className="mt-5 min-h-[34rem] w-full resize-y scroll-smooth rounded-2xl border border-white/10 bg-[#080b1a]/90 p-5 font-mono text-sm leading-7 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/20"
            id="json-editor"
            onChange={(event) => {
              setJsonText(event.target.value);
              setActionMessage("Validation updates as you type.");
            }}
            onKeyDown={(event) => {
              if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                event.preventDefault();
                formatJson();
              }
            }}
            placeholder={`{\n  "name": "TinyUtility",\n  "private": true\n}`}
            ref={editorRef}
            spellCheck="false"
            value={jsonText}
          />

          <p className="mt-4 text-sm text-slate-400" role="status">
            {actionMessage}
          </p>
        </div>

        <aside className="space-y-6">
          <div
            className={`rounded-3xl border p-6 shadow-2xl shadow-black/20 ${
              validation.isValid
                ? "border-teal-300/25 bg-teal-300/10"
                : jsonText.trim()
                  ? "border-red-300/25 bg-red-300/10"
                  : "border-white/10 bg-white/[0.04]"
            }`}
          >
            <p
              className={`text-sm font-semibold uppercase tracking-[0.16em] ${
                validation.isValid ? "text-teal-200" : jsonText.trim() ? "text-red-200" : "text-slate-400"
              }`}
            >
              Validation
            </p>
            <p className="mt-4 text-xl font-semibold text-white">
              {validation.isValid ? "✓ Valid JSON" : jsonText.trim() ? "✕ Invalid JSON" : "No JSON yet"}
            </p>
            {!validation.isValid ? (
              <p className="mt-3 text-sm leading-6 text-slate-300">
                {validation.message}
                {validationDetails ? <span className="block text-slate-400">{validationDetails}</span> : null}
              </p>
            ) : null}
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20">
            <h2 className="text-lg font-semibold text-white">Statistics</h2>
            <dl className="mt-5 grid gap-3">
              <InlineStat label="Characters" value={formatNumber(stats.characters)} />
              <InlineStat label="Lines" value={formatNumber(stats.lines)} />
              <InlineStat label="File size" value={formatBytes(stats.bytes)} />
            </dl>
          </div>
        </aside>
      </div>
    </section>
  );
}

type InlineStatProps = {
  label: string;
  value: string;
};

function InlineStat({ label, value }: InlineStatProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#080b1a]/70 p-4">
      <dt className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">{label}</dt>
      <dd className="mt-2 break-words text-sm font-semibold text-white">{value}</dd>
    </div>
  );
}
