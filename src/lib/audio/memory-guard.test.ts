import { describe, expect, it } from "vitest";
import {
  decodedBytesPerSample,
  estimateDecodedPcmBytes,
  isDecodedSizeSafe,
  isTotalDecodedSizeSafe,
  maxDecodedPcmBytes,
  maxJoinInputFiles,
} from "./memory-guard";

describe("estimateDecodedPcmBytes", () => {
  it("computes channels x sampleRate x duration x bytesPerSample", () => {
    const bytes = estimateDecodedPcmBytes(2, 44100, 10);
    expect(bytes).toBe(2 * 44100 * 10 * decodedBytesPerSample);
  });

  it("returns 0 for non-finite inputs instead of NaN", () => {
    expect(estimateDecodedPcmBytes(NaN, 44100, 10)).toBe(0);
    expect(estimateDecodedPcmBytes(2, Infinity, 10)).toBe(0);
  });

  it("treats negative inputs as zero rather than producing a negative footprint", () => {
    expect(estimateDecodedPcmBytes(-2, 44100, 10)).toBe(0);
  });
});

describe("isDecodedSizeSafe", () => {
  it("accepts a typical, reasonably-sized file", () => {
    // ~3 minutes of 44.1kHz stereo audio
    expect(isDecodedSizeSafe(2, 44100, 180)).toBe(true);
  });

  it("accepts a decoded size right at the boundary", () => {
    const durationForExactLimit = maxDecodedPcmBytes / (2 * 44100 * decodedBytesPerSample);
    expect(isDecodedSizeSafe(2, 44100, durationForExactLimit)).toBe(true);
  });

  it("rejects a decoded size that exceeds the configured budget", () => {
    // A long, high-channel-count file that would blow well past the memory budget.
    expect(isDecodedSizeSafe(8, 96000, 24 * 60 * 60)).toBe(false);
  });
});

describe("isTotalDecodedSizeSafe", () => {
  it("accepts a handful of ordinarily-sized files summed together", () => {
    const perFile = estimateDecodedPcmBytes(2, 44100, 180); // ~3 minutes each
    expect(isTotalDecodedSizeSafe([perFile, perFile, perFile])).toBe(true);
  });

  it("accepts a total right at the exact boundary", () => {
    expect(isTotalDecodedSizeSafe([maxDecodedPcmBytes])).toBe(true);
    expect(isTotalDecodedSizeSafe([maxDecodedPcmBytes / 2, maxDecodedPcmBytes / 2])).toBe(true);
  });

  it("rejects a total that exceeds the budget even when no single file would on its own", () => {
    const perFile = maxDecodedPcmBytes / 4;
    // 5 files at 1/4 of the budget each sum to 1.25x the budget.
    expect(isTotalDecodedSizeSafe([perFile, perFile, perFile, perFile, perFile])).toBe(false);
  });

  it("rejects many files whose sum is large, exercising the 'many files' case", () => {
    const perFile = estimateDecodedPcmBytes(2, 96000, 3600); // 1 hour each, high sample rate
    const manyFiles = new Array(maxJoinInputFiles).fill(perFile);
    expect(isTotalDecodedSizeSafe(manyFiles)).toBe(false);
  });

  it("treats non-finite entries as zero rather than corrupting the sum", () => {
    expect(isTotalDecodedSizeSafe([100, NaN, 200])).toBe(true);
  });

  it("accepts an empty list", () => {
    expect(isTotalDecodedSizeSafe([])).toBe(true);
  });
});

describe("maxJoinInputFiles", () => {
  it("is a positive, sensible (non-tiny) cap", () => {
    expect(maxJoinInputFiles).toBeGreaterThan(5);
  });
});
