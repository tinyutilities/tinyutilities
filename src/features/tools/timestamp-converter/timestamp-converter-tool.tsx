"use client";

import { useId, useState } from "react";

type Unit = "seconds" | "milliseconds";

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

function pad(value: number, length = 2) {
  return String(value).padStart(length, "0");
}

/** Formats an absolute instant (epoch milliseconds) as an unambiguous UTC string — the
 *  deterministic primary result, independent of the viewer's browser/locale. */
function formatUtc(ms: number) {
  const date = new Date(ms);

  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())} UTC`;
}

/** Formats the same instant in the viewer's local timezone, explicitly labeled with its UTC
 *  offset so it's never mistaken for the UTC result above. Secondary/informational only. */
function formatLocal(ms: number) {
  const date = new Date(ms);
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absMinutes = Math.abs(offsetMinutes);
  const offset = `UTC${sign}${pad(Math.floor(absMinutes / 60))}:${pad(absMinutes % 60)}`;

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())} (${offset})`;
}

function msToUnit(ms: number, unit: Unit) {
  return unit === "seconds" ? ms / 1000 : ms;
}

type TimestampParseResult = { ms: number; error: null } | { ms: null; error: string };

/** Parses a Unix timestamp in the given unit. Negative values (pre-1970 instants) and decimal
 *  values (fractional seconds/milliseconds) are both accepted deliberately — the input is
 *  mathematically converted to epoch milliseconds without rounding until display time. */
function parseTimestampInput(raw: string, unit: Unit): TimestampParseResult {
  const trimmed = raw.trim();

  if (!trimmed) {
    return { ms: null, error: "Enter a Unix timestamp." };
  }

  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return { ms: null, error: "Enter a valid number (digits only, with an optional leading - and decimal point)." };
  }

  const numericValue = Number(trimmed);

  if (!Number.isFinite(numericValue)) {
    return { ms: null, error: "Enter a valid number." };
  }

  const ms = unit === "seconds" ? numericValue * 1000 : numericValue;

  if (Number.isNaN(new Date(ms).getTime())) {
    return { ms: null, error: "That timestamp is outside the supported date range." };
  }

  return { ms, error: null };
}

type DateParseResult = { ms: number; error: null } | { ms: null; error: string };

/**
 * Parses a date/time string using two explicit, unambiguous formats only:
 *  1. `YYYY-MM-DD HH:mm:ss` (or with a `T` separator, seconds/fractional seconds optional) —
 *     interpreted as UTC explicitly via `Date.UTC`, never the browser's local timezone.
 *  2. ISO 8601 with an explicit timezone (`Z` or `+HH:mm`/`-HH:mm`) — parsed natively, honoring
 *     the given offset.
 * Both branches round-trip the constructed date back through its UTC (or native) fields to
 * reject calendar-impossible input (Feb 30, month 13, hour 25, ...) that `Date.UTC` would
 * otherwise silently roll over into a different, wrong date. Any other input format is
 * rejected rather than handed to the ambiguous general-purpose `new Date(string)` parser.
 */
function parseUtcDateInput(raw: string): DateParseResult {
  const trimmed = raw.trim();

  if (!trimmed) {
    return { ms: null, error: "Enter a date and time." };
  }

  const plainMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2})(\.\d{1,3})?)?$/);

  if (plainMatch) {
    const [, yearStr, monthStr, dayStr, hourStr, minuteStr, secondStr, fractionStr] = plainMatch;
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);
    const hour = Number(hourStr);
    const minute = Number(minuteStr);
    const second = secondStr ? Number(secondStr) : 0;
    const millisecond = fractionStr ? Math.round(Number(fractionStr) * 1000) : 0;

    const utcMs = Date.UTC(year, month - 1, day, hour, minute, second, millisecond);
    const roundTrip = new Date(utcMs);

    const isValidCalendarDate =
      roundTrip.getUTCFullYear() === year &&
      roundTrip.getUTCMonth() === month - 1 &&
      roundTrip.getUTCDate() === day &&
      roundTrip.getUTCHours() === hour &&
      roundTrip.getUTCMinutes() === minute &&
      roundTrip.getUTCSeconds() === second;

    if (!isValidCalendarDate) {
      return { ms: null, error: "That date doesn't exist. Check the day, month, and time." };
    }

    return { ms: utcMs, error: null };
  }

  const hasExplicitTimezone = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/.test(trimmed);

  if (hasExplicitTimezone) {
    const parsed = new Date(trimmed);

    if (Number.isNaN(parsed.getTime())) {
      return { ms: null, error: "That date doesn't exist. Check the day, month, and time." };
    }

    return { ms: parsed.getTime(), error: null };
  }

  return {
    ms: null,
    error: "Use YYYY-MM-DD HH:mm:ss (UTC), or ISO 8601 with a timezone, like 2026-01-01T00:00:00Z.",
  };
}

type CopyState = { field: string; text: string; isError: boolean } | null;

export function TimestampConverterTool() {
  const unitLegendId = useId();
  const timestampInputId = useId();
  const dateInputId = useId();

  const [unit, setUnit] = useState<Unit>("seconds");
  const [timestampInput, setTimestampInput] = useState("");
  const [timestampResultMs, setTimestampResultMs] = useState<number | null>(null);
  const [timestampError, setTimestampError] = useState<string | null>(null);

  const [dateInput, setDateInput] = useState("");
  const [dateResultMs, setDateResultMs] = useState<number | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);

  const [copyState, setCopyState] = useState<CopyState>(null);

  const convertTimestampToDate = () => {
    const result = parseTimestampInput(timestampInput, unit);
    setCopyState(null);

    if (result.error) {
      setTimestampError(result.error);
      setTimestampResultMs(null);
      return;
    }

    setTimestampError(null);
    setTimestampResultMs(result.ms);
  };

  const convertDateToTimestamp = () => {
    const result = parseUtcDateInput(dateInput);
    setCopyState(null);

    if (result.error) {
      setDateError(result.error);
      setDateResultMs(null);
      return;
    }

    setDateError(null);
    setDateResultMs(result.ms);
  };

  const clearAll = () => {
    setTimestampInput("");
    setTimestampResultMs(null);
    setTimestampError(null);
    setDateInput("");
    setDateResultMs(null);
    setDateError(null);
    setCopyState(null);
  };

  const copyValue = async (field: string, text: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else if (!copyWithFallback(text)) {
        throw new Error("Fallback copy failed.");
      }
      setCopyState({ field, text, isError: false });
    } catch {
      setCopyState({ field, text, isError: true });
    }
  };

  return (
    <section className="mt-16 space-y-6">
      <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-5 text-sm font-medium leading-6 text-cyan-100">
        Conversion happens entirely in your browser. Nothing is sent anywhere.
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 sm:p-6">
        <fieldset>
          <legend className="text-sm font-semibold text-white" id={unitLegendId}>
            Unix timestamp unit
          </legend>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Applies to both the timestamp input below and the timestamp result on the right.
          </p>
          <div className="mt-3 flex flex-wrap gap-3" role="radiogroup" aria-labelledby={unitLegendId}>
            {(["seconds", "milliseconds"] as Unit[]).map((option) => (
              <label
                className="flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-300/30"
                key={option}
              >
                <input
                  checked={unit === option}
                  className="size-4 accent-cyan-300"
                  onChange={() => setUnit(option)}
                  type="radio"
                />
                {option === "seconds" ? "Seconds" : "Milliseconds"}
              </label>
            ))}
          </div>
        </fieldset>

        <button
          className="mt-5 rounded-full border border-red-300/25 bg-red-300/10 px-5 py-2.5 text-sm font-semibold text-red-100 transition hover:-translate-y-0.5 hover:border-red-200/50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          disabled={!timestampInput && !dateInput && timestampResultMs === null && dateResultMs === null}
          onClick={clearAll}
          type="button"
        >
          Clear
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 sm:p-6">
          <h2 className="text-lg font-semibold text-white">Timestamp → Date</h2>

          <label className="mt-4 block" htmlFor={timestampInputId}>
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Unix timestamp ({unit})
            </span>
            <input
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#080b1a] px-4 py-2.5 font-mono text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/20"
              id={timestampInputId}
              inputMode="numeric"
              onChange={(event) => setTimestampInput(event.target.value)}
              placeholder={unit === "seconds" ? "1767225600" : "1767225600000"}
              type="text"
              value={timestampInput}
            />
          </label>

          <button
            className="mt-4 rounded-full bg-gradient-to-r from-[#4F46E5] via-[#06B6D4] to-[#14B8A6] px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:shadow-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            disabled={!timestampInput}
            onClick={convertTimestampToDate}
            type="button"
          >
            Convert to Date
          </button>

          {timestampError ? (
            <p className="mt-3 text-sm text-red-300" role="alert">
              {timestampError}
            </p>
          ) : null}

          {timestampResultMs !== null ? (
            <div className="mt-5 space-y-2">
              <ResultRow
                copied={copyState?.field === "utc-date" && !copyState.isError}
                copyErrored={copyState?.field === "utc-date" && copyState.isError}
                label="UTC"
                onCopy={() => copyValue("utc-date", formatUtc(timestampResultMs))}
                value={formatUtc(timestampResultMs)}
              />
              <ResultRow
                copied={copyState?.field === "iso-date" && !copyState.isError}
                copyErrored={copyState?.field === "iso-date" && copyState.isError}
                label="ISO 8601"
                onCopy={() => copyValue("iso-date", new Date(timestampResultMs).toISOString())}
                value={new Date(timestampResultMs).toISOString()}
              />
              <ResultRow
                copied={copyState?.field === "local-date" && !copyState.isError}
                copyErrored={copyState?.field === "local-date" && copyState.isError}
                label="Your local time"
                onCopy={() => copyValue("local-date", formatLocal(timestampResultMs))}
                value={formatLocal(timestampResultMs)}
              />
            </div>
          ) : null}
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 sm:p-6">
          <h2 className="text-lg font-semibold text-white">Date → Timestamp</h2>

          <label className="mt-4 block" htmlFor={dateInputId}>
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Date/time (UTC), or ISO 8601 with a timezone
            </span>
            <input
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#080b1a] px-4 py-2.5 font-mono text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/20"
              id={dateInputId}
              onChange={(event) => setDateInput(event.target.value)}
              placeholder="2026-01-01 00:00:00"
              type="text"
              value={dateInput}
            />
          </label>

          <button
            className="mt-4 rounded-full bg-gradient-to-r from-[#4F46E5] via-[#06B6D4] to-[#14B8A6] px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:shadow-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            disabled={!dateInput}
            onClick={convertDateToTimestamp}
            type="button"
          >
            Convert to Timestamp
          </button>

          {dateError ? (
            <p className="mt-3 text-sm text-red-300" role="alert">
              {dateError}
            </p>
          ) : null}

          {dateResultMs !== null ? (
            <div className="mt-5 space-y-2">
              <ResultRow
                copied={copyState?.field === "timestamp" && !copyState.isError}
                copyErrored={copyState?.field === "timestamp" && copyState.isError}
                label={`Unix timestamp (${unit})`}
                onCopy={() => copyValue("timestamp", String(msToUnit(dateResultMs, unit)))}
                value={String(msToUnit(dateResultMs, unit))}
              />
              <ResultRow
                copied={copyState?.field === "confirm-utc" && !copyState.isError}
                copyErrored={copyState?.field === "confirm-utc" && copyState.isError}
                label="Interpreted as"
                onCopy={() => copyValue("confirm-utc", formatUtc(dateResultMs))}
                value={formatUtc(dateResultMs)}
              />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

type ResultRowProps = {
  label: string;
  value: string;
  onCopy: () => void;
  copied: boolean;
  copyErrored: boolean;
};

function ResultRow({ label, value, onCopy, copied, copyErrored }: ResultRowProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#080b1a]/70 p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</span>
        <button
          aria-label={`Copy ${label}`}
          className="shrink-0 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-cyan-300/40 hover:bg-white/10"
          onClick={onCopy}
          type="button"
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
      <output aria-label={label} className="mt-1 block select-all break-all font-mono text-sm text-white">
        {value}
      </output>
      {copyErrored ? (
        <p className="mt-1 text-xs text-red-300" role="alert">
          Could not copy automatically. Select the value and copy it manually.
        </p>
      ) : null}
    </div>
  );
}
