"use client";

import { useId, useMemo, useState } from "react";

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

type Mode = "encode" | "decode";

export function UrlEncoderDecoderTool() {
  const inputId = useId();
  const outputId = useId();

  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [lastMode, setLastMode] = useState<Mode | null>(null);
  const [lastInput, setLastInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  const hasInput = input.length > 0;
  const isStale = lastMode !== null && lastInput !== input;

  const inputCharCount = input.length;
  const outputCharCount = output.length;

  const encode = () => {
    setError(null);
    setCopyMessage(null);
    setOutput(encodeURIComponent(input));
    setLastMode("encode");
    setLastInput(input);
  };

  const decode = () => {
    setCopyMessage(null);
    try {
      const decoded = decodeURIComponent(input);
      setError(null);
      setOutput(decoded);
    } catch {
      setError("Invalid percent-encoding. Check the encoded text and try again.");
      setOutput("");
    }
    setLastMode("decode");
    setLastInput(input);
  };

  const swap = () => {
    setInput(output);
    setOutput(input);
    setLastMode(null);
    setLastInput("");
    setError(null);
    setCopyMessage(null);
  };

  const clearAll = () => {
    setInput("");
    setOutput("");
    setLastMode(null);
    setLastInput("");
    setError(null);
    setCopyMessage(null);
  };

  const handleCopy = async () => {
    if (!output) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(output);
      } else if (!copyWithFallback(output)) {
        throw new Error("Fallback copy failed.");
      }
      setCopyMessage("Output copied to clipboard.");
    } catch {
      setCopyMessage("Could not copy automatically. Select the output text and copy it manually.");
    }
  };

  const statusMessage = useMemo(() => {
    if (error) return null;
    if (lastMode === "encode") return "Encoded using encodeURIComponent.";
    if (lastMode === "decode") return "Decoded using decodeURIComponent.";
    return null;
  }, [error, lastMode]);

  return (
    <section className="mt-16 space-y-6">
      <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-5 text-sm font-medium leading-6 text-cyan-100">
        Your text never leaves your device. Encoding and decoding happen entirely in your browser.
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm leading-6 text-slate-300">
        This tool performs <strong className="text-white">URI component</strong> encoding and decoding
        (the same behavior as JavaScript&apos;s <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs">encodeURIComponent</code> /{" "}
        <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs">decodeURIComponent</code>), not a full-URL encoder. Delimiter
        characters like <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs">: / ? & =</code> are encoded too, so this is meant
        for encoding a single value (like a query parameter), not an entire URL.
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <label className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300" htmlFor={inputId}>
            Input
          </label>
          <span className="text-xs text-slate-500">{inputCharCount.toLocaleString()} characters</span>
        </div>
        <textarea
          className="mt-3 min-h-[12rem] w-full resize-y rounded-2xl border border-white/10 bg-[#080b1a]/80 p-4 font-mono text-sm leading-6 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/20"
          id={inputId}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Paste or type text or a URI component here."
          spellCheck="false"
          value={input}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          className="rounded-full bg-gradient-to-r from-[#4F46E5] via-[#06B6D4] to-[#14B8A6] px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:shadow-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
          disabled={!hasInput}
          onClick={encode}
          type="button"
        >
          Encode
        </button>
        <button
          className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-5 py-2.5 text-sm font-semibold text-cyan-100 transition hover:-translate-y-0.5 hover:border-cyan-200/50 hover:bg-cyan-300/15 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          disabled={!hasInput}
          onClick={decode}
          type="button"
        >
          Decode
        </button>
        <button
          className="rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          disabled={!hasInput && !output}
          onClick={swap}
          type="button"
        >
          Swap
        </button>
        <button
          className="rounded-full border border-red-300/25 bg-red-300/10 px-5 py-2.5 text-sm font-semibold text-red-100 transition hover:-translate-y-0.5 hover:border-red-200/50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          disabled={!hasInput && !output}
          onClick={clearAll}
          type="button"
        >
          Clear
        </button>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <label className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300" htmlFor={outputId}>
            Output
          </label>
          <span className="text-xs text-slate-500">{outputCharCount.toLocaleString()} characters</span>
        </div>

        <textarea
          className="mt-3 min-h-[12rem] w-full resize-y rounded-2xl border border-white/10 bg-[#080b1a]/70 p-4 font-mono text-sm leading-6 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/20"
          id={outputId}
          onChange={(event) => setOutput(event.target.value)}
          placeholder="Result will appear here after Encode or Decode."
          spellCheck="false"
          value={output}
        />

        {error ? (
          <p className="mt-3 text-sm text-red-300" role="alert">
            {error}
          </p>
        ) : null}

        {!error && isStale ? (
          <p className="mt-3 text-sm text-amber-200" role="status">
            Input has changed since this result. Click Encode or Decode to update it.
          </p>
        ) : null}

        {!error && !isStale && statusMessage ? (
          <p className="mt-3 text-sm text-slate-400" role="status">
            {statusMessage}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-5 py-2.5 text-sm font-semibold text-cyan-100 transition hover:-translate-y-0.5 hover:border-cyan-200/50 hover:bg-cyan-300/15 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            disabled={!output}
            onClick={handleCopy}
            type="button"
          >
            Copy Output
          </button>
          {copyMessage ? (
            <p className="text-xs text-slate-400" role="status">
              {copyMessage}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
