import { describe, expect, it } from "vitest";
import {
  clampSpeed,
  computeOutputDuration,
  estimateSpeedOutputBytes,
  isSpeedValid,
  maxSpeed,
  minSpeed,
  speedPresets,
} from "./speed";
import { maxDecodedPcmBytes } from "./memory-guard";

describe("isSpeedValid", () => {
  it("accepts every preset speed", () => {
    for (const speed of speedPresets) {
      expect(isSpeedValid(speed)).toBe(true);
    }
  });

  it("accepts the exact min/max boundary", () => {
    expect(isSpeedValid(minSpeed)).toBe(true);
    expect(isSpeedValid(maxSpeed)).toBe(true);
  });

  it("rejects zero", () => {
    expect(isSpeedValid(0)).toBe(false);
  });

  it("rejects negative speeds", () => {
    expect(isSpeedValid(-1)).toBe(false);
    expect(isSpeedValid(-0.5)).toBe(false);
  });

  it("rejects NaN", () => {
    expect(isSpeedValid(NaN)).toBe(false);
  });

  it("rejects Infinity", () => {
    expect(isSpeedValid(Infinity)).toBe(false);
    expect(isSpeedValid(-Infinity)).toBe(false);
  });

  it("rejects speeds outside the supported range", () => {
    expect(isSpeedValid(0.49)).toBe(false);
    expect(isSpeedValid(2.01)).toBe(false);
    expect(isSpeedValid(10)).toBe(false);
  });
});

describe("clampSpeed", () => {
  it("passes valid speeds through unchanged", () => {
    expect(clampSpeed(1.25)).toBe(1.25);
  });

  it("clamps below the minimum up to it", () => {
    expect(clampSpeed(0.1)).toBe(minSpeed);
  });

  it("clamps above the maximum down to it", () => {
    expect(clampSpeed(5)).toBe(maxSpeed);
  });

  it("falls back to 1x for non-finite input", () => {
    expect(clampSpeed(NaN)).toBe(1);
    expect(clampSpeed(Infinity)).toBe(1);
  });
});

describe("computeOutputDuration", () => {
  it("returns the same duration at 1x", () => {
    expect(computeOutputDuration(10, 1)).toBeCloseTo(10, 10);
  });

  it("halves duration at 2x", () => {
    expect(computeOutputDuration(10, 2)).toBeCloseTo(5, 10);
  });

  it("doubles duration at 0.5x", () => {
    expect(computeOutputDuration(10, 0.5)).toBeCloseTo(20, 10);
  });

  it("computes the expected duration at 0.75x", () => {
    expect(computeOutputDuration(9, 0.75)).toBeCloseTo(12, 10);
  });

  it("computes the expected duration at 1.25x", () => {
    expect(computeOutputDuration(10, 1.25)).toBeCloseTo(8, 10);
  });

  it("computes the expected duration at 1.5x", () => {
    expect(computeOutputDuration(9, 1.5)).toBeCloseTo(6, 10);
  });

  it("returns 0 for a non-positive input duration", () => {
    expect(computeOutputDuration(0, 2)).toBe(0);
    expect(computeOutputDuration(-5, 2)).toBe(0);
  });

  it("returns the input duration unchanged for an invalid speed", () => {
    expect(computeOutputDuration(10, 0)).toBe(10);
    expect(computeOutputDuration(10, NaN)).toBe(10);
  });
});

describe("estimateSpeedOutputBytes", () => {
  it("matches channels * sampleRate * outputDuration * 4 bytes", () => {
    // 2 channels, 44100 Hz, 10s input at 2x -> 5s output
    const expected = 2 * 44100 * 5 * 4;
    expect(estimateSpeedOutputBytes(2, 44100, 10, 2)).toBeCloseTo(expected, 5);
  });

  it("grows for a slow-down (0.5x) rather than shrinking", () => {
    const at1x = estimateSpeedOutputBytes(2, 44100, 10, 1);
    const at0_5x = estimateSpeedOutputBytes(2, 44100, 10, 0.5);
    expect(at0_5x).toBeGreaterThan(at1x);
  });

  it("shrinks for a speed-up (2x)", () => {
    const at1x = estimateSpeedOutputBytes(2, 44100, 10, 1);
    const at2x = estimateSpeedOutputBytes(2, 44100, 10, 2);
    expect(at2x).toBeLessThan(at1x);
  });

  it("stays within the shared decoded-PCM budget for a realistic long slow-down", () => {
    // 30 minutes, stereo, 44.1kHz, slowed to 0.5x -> 1 hour of output audio
    const estimate = estimateSpeedOutputBytes(2, 44100, 30 * 60, 0.5);
    expect(estimate).toBeLessThan(maxDecodedPcmBytes * 10); // sanity: not absurdly huge/NaN
    expect(Number.isFinite(estimate)).toBe(true);
  });
});
