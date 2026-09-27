import type { TimeSelection } from "./types";

/** Smallest selection allowed, in seconds — purely a technical floor (a zero-length selection
 *  can't be previewed or exported meaningfully), not a creative constraint. */
export const minSelectionDuration = 0.01;

/**
 * Clamps a proposed [start, end) selection to a valid range within [0, duration], enforcing
 * `minSelectionDuration` by pushing whichever edge just moved, never the one the caller didn't
 * touch — so dragging the start handle never silently relocates the end handle, and vice versa.
 */
export function clampSelection(
  proposed: TimeSelection,
  duration: number,
  movedEdge: "start" | "end" | "both" = "both",
): TimeSelection {
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
  let { start, end } = proposed;

  start = clampNumber(start, 0, safeDuration);
  end = clampNumber(end, 0, safeDuration);

  if (end - start < minSelectionDuration) {
    if (movedEdge === "start") {
      start = Math.min(start, Math.max(0, safeDuration - minSelectionDuration));
      end = Math.min(safeDuration, start + minSelectionDuration);
    } else {
      end = Math.max(end, Math.min(safeDuration, minSelectionDuration));
      start = Math.max(0, end - minSelectionDuration);
    }
  }

  return { start, end };
}

/** The full-length selection for a newly decoded buffer. */
export function fullSelection(duration: number): TimeSelection {
  return { start: 0, end: Number.isFinite(duration) && duration > 0 ? duration : 0 };
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}

/**
 * Formats seconds as `mm:ss.mmm` (or `h:mm:ss.mmm` once the duration reaches an hour), rounding
 * to whole milliseconds so repeated formatting of the same value is always stable — never
 * drifting by a millisecond between renders due to float rounding.
 */
export function formatTime(totalSeconds: number, showHours = false): string {
  const safeSeconds = Number.isFinite(totalSeconds) && totalSeconds > 0 ? totalSeconds : 0;
  const totalMs = Math.round(safeSeconds * 1000);

  const ms = totalMs % 1000;
  const totalWholeSeconds = Math.floor(totalMs / 1000);
  const seconds = totalWholeSeconds % 60;
  const totalMinutes = Math.floor(totalWholeSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);

  const msLabel = String(ms).padStart(3, "0");
  const secLabel = String(seconds).padStart(2, "0");

  if (showHours || hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${secLabel}.${msLabel}`;
  }

  return `${String(minutes).padStart(2, "0")}:${secLabel}.${msLabel}`;
}

/**
 * Parses a user-typed time string back into seconds. Accepts the same `mm:ss.mmm` /
 * `h:mm:ss.mmm` shapes `formatTime` produces, plus a bare seconds value (e.g. "12.4"), so pasting
 * either back in works. Returns `null` for anything unparseable rather than guessing.
 */
export function parseTimeInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }

  const parts = trimmed.split(":");
  if (parts.length < 2 || parts.length > 3 || parts.some((part) => part.trim() === "")) {
    return null;
  }

  const numericParts = parts.map(Number);
  if (numericParts.some((part) => !Number.isFinite(part))) return null;

  const [hoursOrMinutes, minutesOrSeconds, seconds] = numericParts;

  if (parts.length === 3) {
    return hoursOrMinutes * 3600 + minutesOrSeconds * 60 + seconds;
  }

  return hoursOrMinutes * 60 + minutesOrSeconds;
}
