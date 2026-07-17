"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type TextAnalysis = {
  words: number;
  characters: number;
  charactersNoSpaces: number;
  sentences: number;
  paragraphs: number;
  lines: number;
  readingMinutes: number;
  speakingMinutes: number;
  longestWord: string;
  averageWordLength: number;
};

type ToolStatus = "idle" | "success" | "error";

const emptyAnalysis: TextAnalysis = {
  words: 0,
  characters: 0,
  charactersNoSpaces: 0,
  sentences: 0,
  paragraphs: 0,
  lines: 0,
  readingMinutes: 0,
  speakingMinutes: 0,
  longestWord: "-",
  averageWordLength: 0,
};

const readingWordsPerMinute = 225;
const speakingWordsPerMinute = 150;
const debounceMs = 125;

function isAlphaNumeric(code: number) {
  return (code >= 48 && code <= 57) || (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
}

function isWhitespace(code: number) {
  return code === 9 || code === 10 || code === 11 || code === 12 || code === 13 || code === 32 || code === 160;
}

function isSentenceTerminal(code: number) {
  return code === 33 || code === 46 || code === 63;
}

function formatDuration(minutes: number) {
  if (minutes === 0) {
    return "0 min";
  }

  if (minutes < 1) {
    return "< 1 min";
  }

  return `${Math.ceil(minutes)} min`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en").format(value);
}

function analyzeText(text: string): TextAnalysis {
  if (!text) {
    return emptyAnalysis;
  }

  let words = 0;
  let wordCharacters = 0;
  let currentWordCharacters = 0;
  let currentWordStart = -1;
  let longestWord = "";
  let longestWordLength = 0;
  let charactersNoSpaces = 0;
  let sentences = 0;
  let lines = 1;
  let paragraphs = 0;
  let hasParagraphText = false;
  let blankLineCandidate = true;
  let previousWasTerminal = false;

  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    const nextCode = index + 1 < text.length ? text.charCodeAt(index + 1) : 0;
    const alphaNumeric = isAlphaNumeric(code);
    const whitespace = isWhitespace(code);

    if (!whitespace) {
      charactersNoSpaces += 1;
      hasParagraphText = true;
      blankLineCandidate = false;
    }

    if (alphaNumeric) {
      if (currentWordCharacters === 0) {
        currentWordStart = index;
      }

      currentWordCharacters += 1;
      wordCharacters += 1;
    } else if ((code === 39 || code === 45) && currentWordCharacters > 0 && isAlphaNumeric(nextCode)) {
      // Keep contractions and hyphenated terms as one word without inflating average length.
    } else if (currentWordCharacters > 0) {
      words += 1;

      if (currentWordCharacters > longestWordLength) {
        longestWordLength = currentWordCharacters;
        longestWord = text.slice(currentWordStart, index);
      }

      currentWordCharacters = 0;
      currentWordStart = -1;
    }

    if (isSentenceTerminal(code)) {
      if (!previousWasTerminal) {
        sentences += 1;
      }

      previousWasTerminal = true;
    } else if (!whitespace) {
      previousWasTerminal = false;
    }

    if (code === 10 || (code === 13 && nextCode !== 10)) {
      lines += 1;

      if (blankLineCandidate && hasParagraphText) {
        paragraphs += 1;
        hasParagraphText = false;
      }

      blankLineCandidate = true;
    }
  }

  if (currentWordCharacters > 0) {
    words += 1;

    if (currentWordCharacters > longestWordLength) {
      longestWord = text.slice(currentWordStart);
    }
  }

  if (hasParagraphText) {
    paragraphs += 1;
  }

  return {
    words,
    characters: text.length,
    charactersNoSpaces,
    sentences,
    paragraphs,
    lines,
    readingMinutes: words / readingWordsPerMinute,
    speakingMinutes: words / speakingWordsPerMinute,
    longestWord: longestWord || "-",
    averageWordLength: words === 0 ? 0 : wordCharacters / words,
  };
}

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

function downloadText(value: string) {
  const blob = new Blob([value], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.download = "tinyutility-word-counter.txt";
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

export function WordCounterTool() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [debouncedText, setDebouncedText] = useState("");
  const [status, setStatus] = useState<ToolStatus>("idle");
  const [message, setMessage] = useState("Start typing or paste your text here.");
  const hasText = text.length > 0;

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedText(text);
    }, debounceMs);

    return () => window.clearTimeout(timeout);
  }, [text]);

  const analysis = useMemo(() => analyzeText(debouncedText), [debouncedText]);

  const handleCopy = useCallback(async () => {
    if (!text) {
      return;
    }

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else if (!copyWithFallback(text)) {
        throw new Error("Fallback copy failed.");
      }

      setStatus("success");
      setMessage("Text copied to clipboard.");
    } catch {
      setStatus("error");
      setMessage("Could not copy the text. Select it manually instead.");
    }
  }, [text]);

  const handleClear = useCallback(() => {
    setText("");
    setDebouncedText("");
    setStatus("idle");
    setMessage("Start typing or paste your text here.");
  }, []);

  const handleDownload = useCallback(() => {
    if (!text) {
      return;
    }

    downloadText(text);
    setStatus("success");
    setMessage("TXT file downloaded.");
  }, [text]);

  const handleUpload = useCallback((fileList: FileList | null) => {
    const file = fileList?.[0];

    if (!file) {
      return;
    }

    if (file.type && file.type !== "text/plain") {
      setStatus("error");
      setMessage("Please choose a TXT file.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const nextText = typeof reader.result === "string" ? reader.result : "";

      setText(nextText);
      setDebouncedText(nextText);
      setStatus("success");
      setMessage(`${file.name} loaded locally.`);
    };
    reader.onerror = () => {
      setStatus("error");
      setMessage("Could not read that TXT file.");
    };
    reader.readAsText(file);
  }, []);

  const statusColor =
    status === "error" ? "text-red-300" : status === "success" ? "text-teal-300" : "text-slate-400";

  return (
    <section className="mt-16 space-y-6">
      <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-5 text-sm font-medium leading-6 text-cyan-100">
        Text is analyzed entirely in your browser. Nothing is uploaded.
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 sm:p-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <label className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300" htmlFor="word-counter-text">
              Text editor
            </label>
            <div className="flex flex-wrap gap-3">
              <button
                className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-5 py-2.5 text-sm font-semibold text-cyan-100 transition hover:-translate-y-0.5 hover:border-cyan-200/50 hover:bg-cyan-300/15 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                disabled={!hasText}
                onClick={handleCopy}
                type="button"
              >
                Copy
              </button>
              <button
                className="rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                disabled={!hasText}
                onClick={handleDownload}
                type="button"
              >
                Download TXT
              </button>
              <button
                className="rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/10"
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                Upload TXT
              </button>
              <button
                className="rounded-full border border-red-300/25 bg-red-300/10 px-5 py-2.5 text-sm font-semibold text-red-100 transition hover:-translate-y-0.5 hover:border-red-200/50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                disabled={!hasText}
                onClick={handleClear}
                type="button"
              >
                Clear
              </button>
              <input
                accept=".txt,text/plain"
                className="sr-only"
                onChange={(event) => {
                  handleUpload(event.target.files);
                  event.target.value = "";
                }}
                ref={fileInputRef}
                type="file"
              />
            </div>
          </div>

          <textarea
            className="mt-5 min-h-[28rem] w-full resize-y rounded-2xl border border-white/10 bg-[#080b1a]/80 p-5 text-base leading-7 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/20"
            id="word-counter-text"
            onChange={(event) => {
              setText(event.target.value);
              if (status !== "idle") {
                setStatus("idle");
                setMessage("Analysis updates as you type.");
              }
            }}
            placeholder="Start typing or paste your text here."
            spellCheck="true"
            value={text}
          />

          <p className={`mt-4 text-sm ${statusColor}`} role={status === "error" ? "alert" : "status"}>
            {message}
          </p>
        </div>

        <aside className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <StatCard label="Words" value={formatNumber(analysis.words)} />
            <StatCard label="Characters" value={formatNumber(analysis.characters)} />
            <StatCard label="Reading Time" value={formatDuration(analysis.readingMinutes)} />
            <StatCard label="Speaking Time" value={formatDuration(analysis.speakingMinutes)} />
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 sm:p-6">
            <h2 className="text-lg font-semibold text-white">Text insights</h2>
            <dl className="mt-5 grid gap-3">
              <InlineStat label="Characters without spaces" value={formatNumber(analysis.charactersNoSpaces)} />
              <InlineStat label="Sentences" value={formatNumber(analysis.sentences)} />
              <InlineStat label="Paragraphs" value={formatNumber(analysis.paragraphs)} />
              <InlineStat label="Lines" value={formatNumber(analysis.lines)} />
              <InlineStat label="Average word length" value={analysis.averageWordLength.toFixed(1)} />
              <InlineStat label="Longest word" value={analysis.longestWord} />
            </dl>
          </div>
        </aside>
      </div>
    </section>
  );
}

type StatCardProps = {
  label: string;
  value: string;
};

function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20">
      <dt className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-300">{label}</dt>
      <dd className="mt-3 break-words text-3xl font-semibold tracking-tight text-white">{value}</dd>
    </div>
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
