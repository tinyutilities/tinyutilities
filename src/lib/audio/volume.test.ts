import { describe, expect, it } from "vitest";
import {
  applyGainToPcm,
  applyGainToPcmSource,
  applyGainToSample,
  clampDb,
  computePeakAmplitude,
  dbPresets,
  dbToGain,
  isDbValid,
  maxDb,
  minDb,
  predictOutputPeak,
  willClip,
} from "./volume";
import type { PcmSource } from "./types";

function makeSource(channels: Float32Array[], sampleRate = 44100): PcmSource {
  return {
    sampleRate,
    numberOfChannels: channels.length,
    length: channels[0]?.length ?? 0,
    getChannelData: (channel: number) => channels[channel],
  };
}

describe("dbToGain", () => {
  it("returns exactly 1x at 0 dB", () => {
    expect(dbToGain(0)).toBe(1);
  });

  it("returns approximately 2x at +6 dB", () => {
    expect(dbToGain(6)).toBeCloseTo(1.9953, 3);
  });

  it("returns approximately 0.5x at -6 dB", () => {
    expect(dbToGain(-6)).toBeCloseTo(0.50119, 4);
  });

  it("returns approximately 3.98x at +12 dB", () => {
    expect(dbToGain(12)).toBeCloseTo(3.9811, 3);
  });

  it("returns approximately 0.251x at -12 dB", () => {
    expect(dbToGain(-12)).toBeCloseTo(0.25119, 4);
  });

  it("returns approximately 0.708x at -3 dB", () => {
    expect(dbToGain(-3)).toBeCloseTo(0.70795, 4);
  });

  it("returns approximately 1.413x at +3 dB", () => {
    expect(dbToGain(3)).toBeCloseTo(1.41254, 4);
  });

  it("falls back to unity gain for non-finite input", () => {
    expect(dbToGain(NaN)).toBe(1);
    expect(dbToGain(Infinity)).toBe(1);
  });
});

describe("isDbValid", () => {
  it("accepts every preset", () => {
    for (const db of dbPresets) {
      expect(isDbValid(db)).toBe(true);
    }
  });

  it("accepts the exact min/max boundary", () => {
    expect(isDbValid(minDb)).toBe(true);
    expect(isDbValid(maxDb)).toBe(true);
  });

  it("rejects NaN", () => {
    expect(isDbValid(NaN)).toBe(false);
  });

  it("rejects Infinity", () => {
    expect(isDbValid(Infinity)).toBe(false);
    expect(isDbValid(-Infinity)).toBe(false);
  });

  it("rejects out-of-range values", () => {
    expect(isDbValid(minDb - 0.01)).toBe(false);
    expect(isDbValid(maxDb + 0.01)).toBe(false);
    expect(isDbValid(100)).toBe(false);
    expect(isDbValid(-100)).toBe(false);
  });
});

describe("clampDb", () => {
  it("passes valid values through unchanged", () => {
    expect(clampDb(3)).toBe(3);
  });

  it("clamps above the maximum down to it", () => {
    expect(clampDb(50)).toBe(maxDb);
  });

  it("clamps below the minimum up to it", () => {
    expect(clampDb(-50)).toBe(minDb);
  });

  it("falls back to 0 dB for non-finite input", () => {
    expect(clampDb(NaN)).toBe(0);
    expect(clampDb(Infinity)).toBe(0);
  });
});

describe("computePeakAmplitude", () => {
  it("returns 0 for silence", () => {
    const source = makeSource([new Float32Array(100)]);
    expect(computePeakAmplitude(source)).toBe(0);
  });

  it("finds the peak across a single channel", () => {
    const source = makeSource([new Float32Array([0.1, -0.5, 0.3, -0.2])]);
    expect(computePeakAmplitude(source)).toBeCloseTo(0.5, 10);
  });

  it("finds the peak across multiple channels", () => {
    const source = makeSource([new Float32Array([0.1, 0.2]), new Float32Array([-0.9, 0.05])]);
    expect(computePeakAmplitude(source)).toBeCloseTo(0.9, 5);
  });

  it("returns 0 for an empty source", () => {
    const source = makeSource([new Float32Array(0)]);
    expect(computePeakAmplitude(source)).toBe(0);
  });
});

describe("predictOutputPeak", () => {
  it("scales the source peak by gain", () => {
    expect(predictOutputPeak(0.5, 2)).toBeCloseTo(1, 10);
  });

  it("returns 0 for silence regardless of gain", () => {
    expect(predictOutputPeak(0, 4)).toBe(0);
  });
});

describe("willClip", () => {
  it("is false for a gain below the clipping threshold", () => {
    expect(willClip(0.5, 1.5)).toBe(false); // predicted peak 0.75
  });

  it("is false exactly at the clipping threshold (peak lands exactly on 1)", () => {
    expect(willClip(0.5, 2)).toBe(false); // predicted peak exactly 1.0, not > 1
  });

  it("is true for a gain above the clipping threshold", () => {
    expect(willClip(0.5, 2.5)).toBe(true); // predicted peak 1.25
  });

  it("is false for negative (attenuating) gain — attenuation never clips", () => {
    expect(willClip(0.9, dbToGainHelper(-6))).toBe(false);
  });

  it("is false at 0 dB (unity gain) when the source itself doesn't already exceed 1", () => {
    expect(willClip(0.8, 1)).toBe(false);
  });

  it("is true for a positive gain on a already-loud source", () => {
    expect(willClip(0.95, dbToGainHelper(6))).toBe(true);
  });

  it("is false for silence at any gain", () => {
    expect(willClip(0, dbToGainHelper(12))).toBe(false);
  });
});

function dbToGainHelper(db: number) {
  return dbToGain(db);
}

describe("applyGainToSample", () => {
  it("passes a positive sample through unchanged at unity gain", () => {
    expect(applyGainToSample(0.5, 1)).toBeCloseTo(0.5, 10);
  });

  it("passes a negative sample through unchanged at unity gain", () => {
    expect(applyGainToSample(-0.5, 1)).toBeCloseTo(-0.5, 10);
  });

  it("passes zero through unchanged at any gain", () => {
    expect(applyGainToSample(0, 5)).toBe(0);
    expect(applyGainToSample(0, 0)).toBe(0);
  });

  it("scales a positive sample up", () => {
    expect(applyGainToSample(0.3, 2)).toBeCloseTo(0.6, 10);
  });

  it("scales a negative sample down (louder negative)", () => {
    expect(applyGainToSample(-0.3, 2)).toBeCloseTo(-0.6, 10);
  });

  it("clamps a positive sample that would exceed 1", () => {
    expect(applyGainToSample(0.9, 3)).toBe(1);
  });

  it("clamps a negative sample that would exceed -1", () => {
    expect(applyGainToSample(-0.9, 3)).toBe(-1);
  });

  it("attenuates without ever clipping", () => {
    expect(applyGainToSample(0.9, 0.1)).toBeCloseTo(0.09, 10);
  });
});

describe("applyGainToPcm", () => {
  it("preserves sample rate and channel count", () => {
    const source = makeSource([new Float32Array([0.1, 0.2]), new Float32Array([0.3, 0.4])], 48000);
    const result = applyGainToPcm(source, 1);
    expect(result.sampleRate).toBe(48000);
    expect(result.numberOfChannels).toBe(2);
  });

  it("preserves length (duration) exactly", () => {
    const source = makeSource([new Float32Array(1000)]);
    const result = applyGainToPcm(source, 2);
    expect(result.channelData[0].length).toBe(1000);
  });

  it("applies gain to every sample of every channel", () => {
    const source = makeSource([new Float32Array([0.1, -0.1]), new Float32Array([0.2, -0.2])]);
    const result = applyGainToPcm(source, 2);
    expect(result.channelData[0][0]).toBeCloseTo(0.2, 5);
    expect(result.channelData[0][1]).toBeCloseTo(-0.2, 5);
    expect(result.channelData[1][0]).toBeCloseTo(0.4, 5);
    expect(result.channelData[1][1]).toBeCloseTo(-0.4, 5);
  });

  it("never produces a sample outside [-1, 1] even with a large gain", () => {
    const source = makeSource([new Float32Array([0.9, -0.9, 0.5, -0.99, 1, -1])]);
    const result = applyGainToPcm(source, dbToGain(12));
    for (const sample of result.channelData[0]) {
      expect(sample).toBeLessThanOrEqual(1);
      expect(sample).toBeGreaterThanOrEqual(-1);
    }
  });

  it("keeps silence silent regardless of gain", () => {
    const source = makeSource([new Float32Array(50)]); // all zeros
    const result = applyGainToPcm(source, dbToGain(12));
    expect(result.channelData[0].every((s) => s === 0)).toBe(true);
  });

  it("does not mutate the source's own channel data", () => {
    const original = new Float32Array([0.1, 0.2, 0.3]);
    const snapshot = Array.from(original);
    const source = makeSource([original]);
    applyGainToPcm(source, 3);
    expect(Array.from(original)).toEqual(snapshot);
  });

  it("handles multi-channel (more than stereo) sources", () => {
    const source = makeSource([
      new Float32Array([0.1]),
      new Float32Array([0.2]),
      new Float32Array([0.3]),
      new Float32Array([0.4]),
    ]);
    const result = applyGainToPcm(source, 2);
    expect(result.numberOfChannels).toBe(4);
    expect(result.channelData[3][0]).toBeCloseTo(0.8, 5);
  });
});

describe("applyGainToPcmSource", () => {
  it("round-trips as a valid PcmSource", () => {
    const source = makeSource([new Float32Array([0.1, 0.2, 0.3])], 44100);
    const result = applyGainToPcmSource(source, 2);
    expect(result.sampleRate).toBe(44100);
    expect(result.numberOfChannels).toBe(1);
    expect(result.length).toBe(3);
    expect(result.getChannelData(0)[0]).toBeCloseTo(0.2, 5);
  });
});

describe("clipping scenarios end-to-end (gain below/at/above threshold)", () => {
  const source = makeSource([new Float32Array([0.5, -0.5, 0.25])]);
  const peak = computePeakAmplitude(source); // 0.5

  it("gain below clipping threshold: no clamping occurs, no clipping predicted", () => {
    const gain = 1.5; // predicted peak 0.75
    expect(willClip(peak, gain)).toBe(false);
    const result = applyGainToPcm(source, gain);
    expect(result.channelData[0][0]).toBeCloseTo(0.75, 5);
  });

  it("gain exactly at clipping threshold: peak lands exactly on 1, not clipped", () => {
    const gain = 2; // predicted peak exactly 1.0
    expect(willClip(peak, gain)).toBe(false);
    const result = applyGainToPcm(source, gain);
    expect(result.channelData[0][0]).toBe(1);
  });

  it("gain above clipping threshold: clamped to 1, clipping predicted", () => {
    const gain = 4; // predicted peak 2.0, well over
    expect(willClip(peak, gain)).toBe(true);
    const result = applyGainToPcm(source, gain);
    expect(result.channelData[0][0]).toBe(1);
    expect(result.channelData[0][1]).toBe(-1);
  });

  it("negative (attenuating) gain never clips", () => {
    const gain = dbToGain(-6);
    expect(willClip(peak, gain)).toBe(false);
  });

  it("0 dB (unity gain) reproduces the source peak exactly", () => {
    const gain = dbToGain(0);
    const result = applyGainToPcm(source, gain);
    expect(result.channelData[0][0]).toBeCloseTo(0.5, 5);
  });

  it("silence stays silent at any gain, never flagged as clipping", () => {
    const silentSource = makeSource([new Float32Array(10)]);
    const silentPeak = computePeakAmplitude(silentSource);
    expect(silentPeak).toBe(0);
    expect(willClip(silentPeak, dbToGain(12))).toBe(false);
    const result = applyGainToPcm(silentSource, dbToGain(12));
    expect(result.channelData[0].every((s) => s === 0)).toBe(true);
  });
});
