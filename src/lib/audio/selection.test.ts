import { describe, expect, it } from "vitest";
import { clampSelection, formatTime, fullSelection, minSelectionDuration, parseTimeInput } from "./selection";

describe("clampSelection", () => {
  it("keeps a normal in-range selection unchanged", () => {
    expect(clampSelection({ start: 2, end: 5 }, 10)).toEqual({ start: 2, end: 5 });
  });

  it("allows start = 0", () => {
    expect(clampSelection({ start: 0, end: 3 }, 10)).toEqual({ start: 0, end: 3 });
  });

  it("allows end = duration", () => {
    expect(clampSelection({ start: 4, end: 10 }, 10)).toEqual({ start: 4, end: 10 });
  });

  it("clamps a negative start up to 0", () => {
    const result = clampSelection({ start: -5, end: 3 }, 10);
    expect(result.start).toBe(0);
  });

  it("clamps an end beyond duration down to duration", () => {
    const result = clampSelection({ start: 2, end: 50 }, 10);
    expect(result.end).toBe(10);
  });

  it("pushes only the end forward when start >= end and start was the moved edge", () => {
    const result = clampSelection({ start: 6, end: 5 }, 10, "start");
    expect(result.start).toBeCloseTo(6, 5);
    expect(result.end - result.start).toBeGreaterThanOrEqual(minSelectionDuration - 1e-9);
  });

  it("pushes only the start backward when start >= end and end was the moved edge", () => {
    const result = clampSelection({ start: 6, end: 5 }, 10, "end");
    expect(result.end).toBeCloseTo(5, 5);
    expect(result.end - result.start).toBeGreaterThanOrEqual(minSelectionDuration - 1e-9);
  });

  it("never returns a selection shorter than minSelectionDuration", () => {
    const result = clampSelection({ start: 3, end: 3 }, 10, "end");
    expect(result.end - result.start).toBeGreaterThanOrEqual(minSelectionDuration - 1e-9);
  });

  it("handles a zero or negative duration without throwing or returning NaN", () => {
    const result = clampSelection({ start: 2, end: 5 }, 0);
    expect(Number.isFinite(result.start)).toBe(true);
    expect(Number.isFinite(result.end)).toBe(true);
    expect(result.start).toBe(0);
    expect(result.end).toBe(0);
  });

  it("preserves fine floating-point precision instead of rounding", () => {
    const result = clampSelection({ start: 1.123456, end: 2.654321 }, 10);
    expect(result.start).toBeCloseTo(1.123456, 6);
    expect(result.end).toBeCloseTo(2.654321, 6);
  });

  it("supports a very short but valid selection", () => {
    const result = clampSelection({ start: 1, end: 1 + minSelectionDuration }, 10);
    expect(result.end - result.start).toBeCloseTo(minSelectionDuration, 6);
  });
});

describe("fullSelection", () => {
  it("spans the entire duration", () => {
    expect(fullSelection(12.5)).toEqual({ start: 0, end: 12.5 });
  });

  it("handles a zero/invalid duration gracefully", () => {
    expect(fullSelection(0)).toEqual({ start: 0, end: 0 });
    expect(fullSelection(NaN)).toEqual({ start: 0, end: 0 });
  });
});

describe("formatTime", () => {
  it("formats sub-minute durations as mm:ss.mmm", () => {
    expect(formatTime(12.43)).toBe("00:12.430");
  });

  it("formats zero", () => {
    expect(formatTime(0)).toBe("00:00.000");
  });

  it("formats a value that crosses a minute boundary", () => {
    expect(formatTime(65.5)).toBe("01:05.500");
  });

  it("formats a value with hours once past 3600 seconds", () => {
    expect(formatTime(3661.25)).toBe("1:01:01.250");
  });

  it("is stable under repeated formatting (no drift)", () => {
    const value = 12.43;
    expect(formatTime(value)).toBe(formatTime(value));
  });
});

describe("parseTimeInput", () => {
  it("parses a bare seconds value", () => {
    expect(parseTimeInput("12.43")).toBeCloseTo(12.43, 5);
  });

  it("parses mm:ss.mmm", () => {
    expect(parseTimeInput("01:05.500")).toBeCloseTo(65.5, 5);
  });

  it("parses h:mm:ss.mmm", () => {
    expect(parseTimeInput("1:01:01.250")).toBeCloseTo(3661.25, 5);
  });

  it("returns null for empty input", () => {
    expect(parseTimeInput("")).toBeNull();
    expect(parseTimeInput("   ")).toBeNull();
  });

  it("returns null for unparseable input", () => {
    expect(parseTimeInput("not a time")).toBeNull();
    expect(parseTimeInput("1:2:3:4")).toBeNull();
  });

  it("round-trips through formatTime", () => {
    const original = 125.75;
    const parsed = parseTimeInput(formatTime(original));
    expect(parsed).toBeCloseTo(original, 3);
  });
});
