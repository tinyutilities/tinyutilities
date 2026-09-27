import { describe, expect, it } from "vitest";
import { computeWaveformPeaks } from "./waveform";
import type { PcmSource } from "./types";

function makeSource(channels: number[][], sampleRate = 44100): PcmSource {
  const numberOfChannels = channels.length;
  const length = channels[0]?.length ?? 0;
  return {
    sampleRate,
    numberOfChannels,
    length,
    getChannelData: (channel: number) => Float32Array.from(channels[channel]),
  };
}

function hasNoNaNOrInfinity(values: Float32Array) {
  return Array.from(values).every((value) => Number.isFinite(value));
}

describe("computeWaveformPeaks", () => {
  it("returns all-zero peaks for silent audio", () => {
    const source = makeSource([new Array(1000).fill(0)]);
    const { min, max } = computeWaveformPeaks(source, 10);

    expect(Array.from(min).every((v) => v === 0)).toBe(true);
    expect(Array.from(max).every((v) => v === 0)).toBe(true);
  });

  it("computes peaks for mono audio", () => {
    const samples = new Array(100).fill(0).map((_, i) => Math.sin(i / 5));
    const source = makeSource([samples]);
    const { min, max } = computeWaveformPeaks(source, 10);

    expect(min).toHaveLength(10);
    expect(max).toHaveLength(10);
    expect(Math.max(...Array.from(max))).toBeLessThanOrEqual(1);
    expect(Math.min(...Array.from(min))).toBeGreaterThanOrEqual(-1);
  });

  it("mixes down stereo channels", () => {
    const left = [1, 1, 1, 1];
    const right = [-1, -1, -1, -1];
    const source = makeSource([left, right]);
    const { min, max } = computeWaveformPeaks(source, 1);

    // Average of +1 and -1 is 0 for every frame.
    expect(min[0]).toBeCloseTo(0, 5);
    expect(max[0]).toBeCloseTo(0, 5);
  });

  it("handles very short audio (fewer frames than buckets)", () => {
    const source = makeSource([[0.5, -0.5]]);
    const { min, max } = computeWaveformPeaks(source, 50);

    expect(min).toHaveLength(50);
    expect(max).toHaveLength(50);
    expect(hasNoNaNOrInfinity(min)).toBe(true);
    expect(hasNoNaNOrInfinity(max)).toBe(true);
  });

  it("handles longer audio efficiently and produces stable bucket counts", () => {
    const samples = new Array(200000).fill(0).map((_, i) => (i % 2 === 0 ? 0.8 : -0.8));
    const source = makeSource([samples]);
    const { min, max } = computeWaveformPeaks(source, 500);

    expect(min).toHaveLength(500);
    expect(max).toHaveLength(500);
    expect(hasNoNaNOrInfinity(min)).toBe(true);
    expect(hasNoNaNOrInfinity(max)).toBe(true);
  });

  it("produces the same output for the same input (stable/deterministic)", () => {
    const samples = new Array(1000).fill(0).map((_, i) => Math.sin(i / 3));
    const source = makeSource([samples]);

    const first = computeWaveformPeaks(source, 20);
    const second = computeWaveformPeaks(source, 20);

    expect(Array.from(first.min)).toEqual(Array.from(second.min));
    expect(Array.from(first.max)).toEqual(Array.from(second.max));
  });

  it("never produces NaN or Infinity, even for a zero-length source", () => {
    const source = makeSource([[]]);
    const { min, max } = computeWaveformPeaks(source, 20);

    expect(hasNoNaNOrInfinity(min)).toBe(true);
    expect(hasNoNaNOrInfinity(max)).toBe(true);
  });

  it("always returns max >= min per bucket for non-silent audio", () => {
    const samples = new Array(500).fill(0).map((_, i) => Math.sin(i / 7) * 0.9);
    const source = makeSource([samples]);
    const { min, max } = computeWaveformPeaks(source, 25);

    for (let i = 0; i < 25; i += 1) {
      expect(max[i]).toBeGreaterThanOrEqual(min[i]);
    }
  });
});
