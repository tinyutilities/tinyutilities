import { describe, expect, it } from "vitest";
import {
  amplitudeToDbfs,
  dbfsToAmplitude,
  defaultNormalizeTargetDb,
  isNormalizeTargetValid,
  largeBoostWarningDb,
  maxNormalizeTargetDb,
  minNormalizeTargetDb,
  normalizePcmSource,
  normalizeTargetPresets,
  planNormalization,
} from "./normalize";
import { computePeakAmplitude } from "./volume";
import type { PcmSource } from "./types";

function makeSource(channels: Float32Array[], sampleRate = 44100): PcmSource {
  return {
    sampleRate,
    numberOfChannels: channels.length,
    length: channels[0]?.length ?? 0,
    getChannelData: (channel: number) => channels[channel],
  };
}

describe("dBFS conversion", () => {
  it("maps full scale to 0 dBFS and half scale to about -6.02 dBFS", () => {
    expect(amplitudeToDbfs(1)).toBe(0);
    expect(amplitudeToDbfs(0.5)).toBeCloseTo(-6.0206, 4);
    expect(amplitudeToDbfs(0.1)).toBeCloseTo(-20, 10);
  });

  it("treats silence as negative infinity", () => {
    expect(amplitudeToDbfs(0)).toBe(Number.NEGATIVE_INFINITY);
    expect(amplitudeToDbfs(Number.NaN)).toBe(Number.NEGATIVE_INFINITY);
  });

  it("round-trips", () => {
    for (const db of [0, -1, -3, -6, -12, -20]) expect(amplitudeToDbfs(dbfsToAmplitude(db))).toBeCloseTo(db, 10);
  });
});

describe("planNormalization", () => {
  it("computes the gain that moves the peak to the target", () => {
    const plan = planNormalization(0.5, 0);
    expect(plan.ok && plan.gain).toBeCloseTo(2, 10);
    expect(plan.ok && plan.gainDb).toBeCloseTo(6.0206, 4);
    expect(plan.ok && plan.sourcePeakDb).toBeCloseTo(-6.0206, 4);
  });

  it("can attenuate a clip that is already louder than the target", () => {
    const plan = planNormalization(1, -6);
    expect(plan.ok && plan.gain).toBeCloseTo(0.501187, 5);
    expect(plan.ok && plan.gainDb).toBeCloseTo(-6, 10);
  });

  it("leaves a clip already at the target at unity gain", () => {
    const plan = planNormalization(dbfsToAmplitude(-3), -3);
    expect(plan.ok && plan.gain).toBeCloseTo(1, 10);
  });

  it("flags very large boosts, because they also amplify noise", () => {
    const quiet = planNormalization(0.01, 0); // +40 dB
    expect(quiet.ok && quiet.largeBoost).toBe(true);
    expect(quiet.ok && quiet.gainDb).toBeGreaterThan(largeBoostWarningDb);
    expect(planNormalization(0.5, 0).ok && (planNormalization(0.5, 0) as { largeBoost: boolean }).largeBoost).toBe(false);
  });

  it("reports silence instead of dividing by zero", () => {
    expect(planNormalization(0, -1)).toEqual({ ok: false, reason: "silent" });
    expect(planNormalization(Number.NaN, -1)).toEqual({ ok: false, reason: "silent" });
  });

  it("rejects targets outside the supported range", () => {
    expect(planNormalization(0.5, 1)).toEqual({ ok: false, reason: "invalid-target" });
    expect(planNormalization(0.5, -30)).toEqual({ ok: false, reason: "invalid-target" });
    expect(planNormalization(0.5, Number.NaN)).toEqual({ ok: false, reason: "invalid-target" });
  });

  it("offers presets that are all valid targets", () => {
    for (const preset of normalizeTargetPresets) expect(isNormalizeTargetValid(preset)).toBe(true);
    expect(isNormalizeTargetValid(defaultNormalizeTargetDb)).toBe(true);
    expect(isNormalizeTargetValid(minNormalizeTargetDb)).toBe(true);
    expect(isNormalizeTargetValid(maxNormalizeTargetDb)).toBe(true);
  });
});

describe("normalizePcmSource", () => {
  it("brings the loudest sample of a quiet clip to the target and never clips", () => {
    const source = makeSource([new Float32Array([0, 0.1, -0.25, 0.05, 0.2])]);

    for (const target of normalizeTargetPresets) {
      const result = normalizePcmSource(source, target);
      expect(result.plan.ok).toBe(true);
      if (!("output" in result)) return;
      expect(result.outputPeak).toBeCloseTo(dbfsToAmplitude(target), 5);
      expect(result.outputPeak).toBeLessThanOrEqual(1);
    }
  });

  it("scales every sample by the same factor, preserving the waveform shape", () => {
    const source = makeSource([new Float32Array([0.1, -0.2, 0.05, 0.4, -0.3])]);
    const result = normalizePcmSource(source, 0);
    if (!("output" in result)) throw new Error("expected output");

    const factor = 1 / 0.4;
    const out = result.output.getChannelData(0);
    [0.1, -0.2, 0.05, 0.4, -0.3].forEach((value, index) => expect(out[index]).toBeCloseTo(value * factor, 5));
  });

  it("uses one gain for all channels so stereo balance is preserved", () => {
    const left = new Float32Array([0.1, 0.2, -0.1]);
    const right = new Float32Array([0.4, -0.4, 0.2]); // louder channel sets the peak
    const result = normalizePcmSource(makeSource([left, right]), 0);
    if (!("output" in result)) throw new Error("expected output");

    expect(result.outputPeak).toBeCloseTo(1, 5);
    // The left channel is still a quarter of the right channel's level.
    expect(result.output.getChannelData(0)[1] / result.output.getChannelData(1)[1]).toBeCloseTo(-0.5, 5);
    expect(result.output.getChannelData(0)[0] / result.output.getChannelData(1)[0]).toBeCloseTo(0.25, 5);
  });

  it("attenuates audio that already peaks above the target", () => {
    const result = normalizePcmSource(makeSource([new Float32Array([1, -1, 0.5])]), -6);
    if (!("output" in result)) throw new Error("expected output");
    expect(result.outputPeak).toBeCloseTo(dbfsToAmplitude(-6), 5);
    expect(result.plan.gainDb).toBeCloseTo(-6, 5);
  });

  it("keeps length, sample rate and channel count, and never modifies the input", () => {
    const channel = new Float32Array([0.1, 0.2, -0.3]);
    const snapshot = Array.from(channel);
    const source = makeSource([channel], 48000);
    const result = normalizePcmSource(source, -1);
    if (!("output" in result)) throw new Error("expected output");

    expect(result.output.length).toBe(3);
    expect(result.output.sampleRate).toBe(48000);
    expect(result.output.numberOfChannels).toBe(1);
    expect(Array.from(channel)).toEqual(snapshot);
    expect(result.output.getChannelData(0)).not.toBe(channel);
  });

  it("is idempotent: normalizing twice to the same target changes nothing further", () => {
    const first = normalizePcmSource(makeSource([new Float32Array([0.1, -0.3, 0.2])]), -3);
    if (!("output" in first)) throw new Error("expected output");
    const second = normalizePcmSource(first.output, -3);
    if (!("output" in second)) throw new Error("expected output");
    expect(second.plan.gainDb).toBeCloseTo(0, 4);
    expect(computePeakAmplitude(second.output)).toBeCloseTo(computePeakAmplitude(first.output), 6);
  });

  it("refuses silent and empty clips", () => {
    expect(normalizePcmSource(makeSource([new Float32Array(100)]), -1).plan).toEqual({ ok: false, reason: "silent" });
    expect(normalizePcmSource(makeSource([new Float32Array(0)]), -1).plan).toEqual({ ok: false, reason: "silent" });
  });

  it("handles a very large boost without producing out-of-range samples", () => {
    const result = normalizePcmSource(makeSource([new Float32Array([0.0001, -0.0002])]), 0);
    if (!("output" in result)) throw new Error("expected output");
    for (const sample of result.output.getChannelData(0)) expect(Math.abs(sample)).toBeLessThanOrEqual(1);
    expect(result.plan.largeBoost).toBe(true);
  });
});
