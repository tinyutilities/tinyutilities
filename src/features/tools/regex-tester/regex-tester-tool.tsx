"use client";

import { useId, useMemo, useState } from "react";

const maxDisplayedMatches = 500;
/** A practical, tested ceiling rather than an arbitrary tiny one: 300,000 characters keeps even
 *  a worst-case zero-length-match pattern (producing roughly one match per character) fast
 *  enough to stay responsive. Larger pastes are still editable — only the Test action is
 *  gated — so nothing is silently truncated. */
const maxTestTextLength = 300000;

type FlagKey = "g" | "i" | "m" | "s" | "u" | "y" | "d";

const flagDefs: { key: FlagKey; label: string; description: string }[] = [
  { key: "g", label: "g — Global", description: "Find all matches instead of stopping after the first." },
  { key: "i", label: "i — Ignore case", description: "Match letters without regard to case." },
  { key: "m", label: "m — Multiline", description: "^ and $ match the start/end of each line, not just the whole text." },
  { key: "s", label: "s — Dot all", description: "Let . also match newline characters." },
  { key: "u", label: "u — Unicode", description: "Treat the pattern as Unicode code points, not code units." },
  { key: "y", label: "y — Sticky", description: "Match only starting at the exact current search position." },
  { key: "d", label: "d — Indices", description: "Include match indices (if supported by this browser)." },
];

function supportsIndicesFlag() {
  try {
    new RegExp("", "d");
    return true;
  } catch {
    return false;
  }
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

type MatchInfo = {
  text: string;
  start: number;
  end: number;
  groups: (string | undefined)[];
  named: Record<string, string> | undefined;
};

function toMatchInfo(match: RegExpExecArray): MatchInfo {
  return {
    text: match[0],
    start: match.index,
    end: match.index + match[0].length,
    groups: match.slice(1),
    named: match.groups,
  };
}

type TestResult =
  | { valid: true; matches: MatchInfo[]; isGlobal: boolean; pattern: string; flags: string }
  | { valid: false; error: string };

/** Builds a fresh RegExp and runs it against `testText`, using native matching only — no
 *  hand-rolled loop logic. Global patterns use `String.prototype.matchAll()`, which is what
 *  correctly advances past zero-length matches per the language spec; non-global patterns use a
 *  single `exec()` call, matching native single-match semantics exactly. A brand-new RegExp
 *  instance is constructed for every call so `lastIndex` state can never leak between runs. */
function runRegexTest(pattern: string, flags: string, testText: string): TestResult {
  let regex: RegExp;

  try {
    regex = new RegExp(pattern, flags);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Invalid regular expression.";
    return { valid: false, error: detail.length > 240 ? `${detail.slice(0, 240)}…` : detail };
  }

  const isGlobal = flags.includes("g");
  const matches: MatchInfo[] = [];

  if (isGlobal) {
    for (const match of testText.matchAll(regex)) {
      matches.push(toMatchInfo(match as RegExpExecArray));
    }
  } else {
    const match = regex.exec(testText);
    if (match) matches.push(toMatchInfo(match));
  }

  return { valid: true, matches, isGlobal, pattern, flags };
}

type Segment = { type: "text" | "match" | "zero-length"; value: string; key: number };

function buildHighlightSegments(text: string, matches: MatchInfo[]): Segment[] {
  const segments: Segment[] = [];
  let cursor = 0;

  matches.forEach((match, index) => {
    if (match.start > cursor) {
      segments.push({ type: "text", value: text.slice(cursor, match.start), key: segments.length });
    }

    if (match.start === match.end) {
      segments.push({ type: "zero-length", value: "", key: segments.length });
    } else {
      segments.push({ type: "match", value: text.slice(match.start, match.end), key: segments.length });
    }

    cursor = Math.max(cursor, match.end);
    void index;
  });

  if (cursor < text.length) {
    segments.push({ type: "text", value: text.slice(cursor), key: segments.length });
  }

  return segments;
}

type CopyState = { field: string; isError: boolean } | null;

export function RegexTesterTool() {
  const patternId = useId();
  const testTextId = useId();
  const flagsLegendId = useId();

  const [dSupported] = useState(() => supportsIndicesFlag());
  const [pattern, setPattern] = useState("");
  const [flags, setFlags] = useState<Record<FlagKey, boolean>>({
    g: true,
    i: false,
    m: false,
    s: false,
    u: false,
    y: false,
    d: false,
  });
  const [testText, setTestText] = useState("");
  const [result, setResult] = useState<TestResult | null>(null);
  const [copyState, setCopyState] = useState<CopyState>(null);

  const flagsString = useMemo(
    () => flagDefs.map((flag) => flag.key).filter((key) => flags[key]).join(""),
    [flags],
  );

  const liveValidity = useMemo(() => {
    if (!pattern.trim()) return null;
    try {
      new RegExp(pattern, flagsString);
      return { valid: true as const };
    } catch (error) {
      return { valid: false as const, message: error instanceof Error ? error.message : "Invalid regular expression." };
    }
  }, [pattern, flagsString]);

  const isTextTooLarge = testText.length > maxTestTextLength;

  const runTest = () => {
    setCopyState(null);
    if (!pattern.trim()) return;
    setResult(runRegexTest(pattern, flagsString, testText));
  };

  const clearAll = () => {
    setPattern("");
    setFlags({ g: true, i: false, m: false, s: false, u: false, y: false, d: false });
    setTestText("");
    setResult(null);
    setCopyState(null);
  };

  const copyValue = async (field: string, text: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else if (!copyWithFallback(text)) {
        throw new Error("Fallback copy failed.");
      }
      setCopyState({ field, isError: false });
    } catch {
      setCopyState({ field, isError: true });
    }
  };

  const toggleFlag = (key: FlagKey) => {
    setFlags((current) => ({ ...current, [key]: !current[key] }));
  };

  const segments = useMemo(() => {
    if (!result || !result.valid || result.matches.length === 0 || result.matches.length > maxDisplayedMatches) {
      return null;
    }
    return buildHighlightSegments(testText, result.matches);
  }, [result, testText]);

  const hasAnyInput = pattern.length > 0 || testText.length > 0;

  return (
    <section className="mt-16 space-y-6">
      <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-5 text-sm font-medium leading-6 text-cyan-100">
        Your pattern and test text stay in your browser. Matching uses your browser&apos;s native JavaScript RegExp engine.
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 sm:p-6">
        <label className="block" htmlFor={patternId}>
          <span className="text-sm font-semibold text-white">Regular expression</span>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Enter the raw pattern only — no <code className="rounded bg-white/10 px-1 py-0.5 font-mono">/</code> delimiters, e.g.{" "}
            <code className="rounded bg-white/10 px-1 py-0.5 font-mono">\bhello\b</code>.
          </p>
          <input
            className="mt-2 w-full rounded-xl border border-white/10 bg-[#080b1a] px-4 py-2.5 font-mono text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/20"
            id={patternId}
            onChange={(event) => {
              setPattern(event.target.value);
              setResult(null);
            }}
            placeholder="\bhello\b"
            spellCheck="false"
            type="text"
            value={pattern}
          />
        </label>

        {liveValidity ? (
          <p className={`mt-2 text-xs ${liveValidity.valid ? "text-teal-300" : "text-red-300"}`} role={liveValidity.valid ? "status" : "alert"}>
            {liveValidity.valid ? "Pattern is valid." : `Invalid pattern: ${liveValidity.message}`}
          </p>
        ) : null}

        <fieldset className="mt-5">
          <legend className="text-sm font-semibold text-white" id={flagsLegendId}>
            Flags
          </legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-2" role="group" aria-labelledby={flagsLegendId}>
            {flagDefs.map((flag) => {
              const disabled = flag.key === "d" && !dSupported;
              return (
                <label
                  className={`flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-slate-200 transition ${disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer hover:border-cyan-300/30"}`}
                  key={flag.key}
                >
                  <input
                    checked={flags[flag.key]}
                    className="mt-0.5 size-4 accent-cyan-300"
                    disabled={disabled}
                    onChange={() => toggleFlag(flag.key)}
                    type="checkbox"
                  />
                  <span>
                    <span className="font-mono font-semibold">{flag.label}</span>
                    <span className="block text-xs text-slate-500">
                      {disabled ? "Not supported in this browser." : flag.description}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <label className="mt-5 block" htmlFor={testTextId}>
          <span className="text-sm font-semibold text-white">Test text</span>
          <textarea
            className="mt-2 min-h-[12rem] w-full resize-y rounded-2xl border border-white/10 bg-[#080b1a]/80 p-4 font-mono text-sm leading-6 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/20"
            id={testTextId}
            onChange={(event) => setTestText(event.target.value)}
            placeholder="Paste or type the text you want to test the pattern against."
            spellCheck="false"
            value={testText}
          />
        </label>

        {isTextTooLarge ? (
          <p className="mt-2 text-sm text-amber-200" role="alert">
            Test text is over {maxTestTextLength.toLocaleString()} characters. Shorten it to run a test.
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            className="rounded-full bg-gradient-to-r from-[#4F46E5] via-[#06B6D4] to-[#14B8A6] px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:shadow-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            disabled={!pattern.trim() || isTextTooLarge}
            onClick={runTest}
            type="button"
          >
            Test Regex
          </button>
          <button
            className="rounded-full border border-red-300/25 bg-red-300/10 px-5 py-2.5 text-sm font-semibold text-red-100 transition hover:-translate-y-0.5 hover:border-red-200/50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            disabled={!hasAnyInput}
            onClick={clearAll}
            type="button"
          >
            Clear
          </button>
        </div>
      </div>

      {result ? (
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 sm:p-6">
          {!result.valid ? (
            <p className="text-sm text-red-300" role="alert">
              Invalid regular expression. {result.error}
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p aria-live="polite" className="text-sm font-semibold text-teal-300" role="status">
                    Valid — {result.matches.length} match{result.matches.length === 1 ? "" : "es"}
                    {!result.isGlobal ? " (first match only — enable the g flag for all matches)" : ""}
                  </p>
                </div>
                {result.matches.length > 0 ? (
                  <button
                    className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-4 py-2 text-xs font-semibold text-cyan-100 transition hover:border-cyan-200/50 hover:bg-cyan-300/15"
                    onClick={() => copyValue("all", result.matches.map((match) => match.text).join("\n"))}
                    type="button"
                  >
                    Copy All Matches
                  </button>
                ) : null}
              </div>

              {copyState?.field === "all" ? (
                <p className={`mt-2 text-xs ${copyState.isError ? "text-red-300" : "text-slate-400"}`} role={copyState.isError ? "alert" : "status"}>
                  {copyState.isError ? "Could not copy automatically. Select the matches and copy them manually." : "All matches copied to clipboard."}
                </p>
              ) : null}

              {segments ? (
                <div className="mt-5">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Highlighted preview</h3>
                  <div className="mt-2 max-h-64 overflow-y-auto rounded-2xl border border-white/10 bg-[#080b1a]/70 p-4 font-mono text-sm leading-6 text-white">
                    <pre className="whitespace-pre-wrap break-words font-mono">
                      {segments.map((segment) => {
                        if (segment.type === "text") return <span key={segment.key}>{segment.value}</span>;
                        if (segment.type === "zero-length") {
                          return (
                            <mark aria-label="zero-length match" className="rounded bg-teal-300/40 px-0.5 text-teal-100" key={segment.key} title="Zero-length match">
                              ‸
                            </mark>
                          );
                        }
                        return (
                          <mark className="rounded bg-teal-300/30 px-0.5 text-teal-50" key={segment.key}>
                            {segment.value}
                          </mark>
                        );
                      })}
                    </pre>
                  </div>
                </div>
              ) : result.matches.length > maxDisplayedMatches ? (
                <p className="mt-3 text-xs text-slate-500">
                  Too many matches to highlight inline ({result.matches.length.toLocaleString()}). See the match list below.
                </p>
              ) : null}

              {result.matches.length > 0 ? (
                <div className="mt-5">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Matches{result.matches.length > maxDisplayedMatches ? ` (showing first ${maxDisplayedMatches} of ${result.matches.length.toLocaleString()})` : ""}
                  </h3>
                  <ul className="mt-3 space-y-2">
                    {result.matches.slice(0, maxDisplayedMatches).map((match, index) => (
                      <li className="rounded-2xl border border-white/10 bg-[#080b1a]/70 p-3" key={index}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-slate-400">
                            Match {index + 1} · index {match.start}–{match.end}
                          </span>
                          <button
                            aria-label={`Copy match ${index + 1}`}
                            className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-cyan-300/40 hover:bg-white/10"
                            onClick={() => copyValue(`match-${index}`, match.text)}
                            type="button"
                          >
                            {copyState?.field === `match-${index}` && !copyState.isError ? "Copied ✓" : "Copy"}
                          </button>
                        </div>
                        <output aria-label={`Match ${index + 1} text`} className="mt-1 block select-all break-all font-mono text-sm text-white">
                          {match.text.length === 0 ? "(zero-length match)" : match.text}
                        </output>
                        {copyState?.field === `match-${index}` && copyState.isError ? (
                          <p className="mt-1 text-xs text-red-300" role="alert">
                            Could not copy automatically. Select the value and copy it manually.
                          </p>
                        ) : null}
                        {match.groups.length > 0 ? (
                          <dl className="mt-2 grid gap-1 text-xs text-slate-400">
                            {match.groups.map((group, groupIndex) => (
                              <div key={groupIndex}>
                                <dt className="inline font-semibold text-slate-300">Group {groupIndex + 1}: </dt>
                                <dd className="inline break-all font-mono">{group === undefined ? "(no match)" : group}</dd>
                              </div>
                            ))}
                          </dl>
                        ) : null}
                        {match.named ? (
                          <dl className="mt-2 grid gap-1 text-xs text-slate-400">
                            {Object.entries(match.named).map(([name, value]) => (
                              <div key={name}>
                                <dt className="inline font-semibold text-slate-300">{name}: </dt>
                                <dd className="inline break-all font-mono">{value === undefined ? "(no match)" : value}</dd>
                              </div>
                            ))}
                          </dl>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-400">No matches found.</p>
              )}
            </>
          )}
        </div>
      ) : null}
    </section>
  );
}
