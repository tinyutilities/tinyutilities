import { describe, expect, it } from "vitest";
import { applyFade, envelopeAt, fadeCurves, fadeGain, maxFadeSeconds, planFade, type FadeCurve } from "./fade";
import type { PcmSource } from "./types";

function makeSource(channels: Float32Array[], sampleRate = 100): PcmSource {
  return {
    sampleRate,
    numberOfChannels: channels.length,
    length: channels[0]?.length ?? 0,
    getChannelData: (channel: number) => channels[channel],
  };
}

const constant = (length: number, value = 1) => new Float32Array(length).fill(value);

describe("fadeGain curves", () => {
  it("runs from silence to full level for every curve", () => {
    for (const { value } of fadeCurves) {
      expect(fadeGain(0, value)).toBe(0);
      expect(fadeGain(1, value)).toBeCloseTo(1, 12);
    }
  });

  it("has the expected midpoint for each curve", () => {
    expect(fadeGain(0.5, "linear")).toBe(0.5);
    expect(fadeGain(0.5, "smooth")).toBeCloseTo(0.5, 12);
    expect(fadeGain(0.5, "exponential")).toBe(0.25);
  });

  it("never decreases as the fade progresses", () => {
    for (const { value } of fadeCurves) {
      let previous = -1;
      for (let step = 0; step <= 100; step += 1) {
        const gain = fadeGain(step / 100, value);
        expect(gain).toBeGreaterThanOrEqual(previous);
        previous = gain;
      }
    }
  });

  it("clamps positions outside 0–1", () => {
    expect(fadeGain(-1, "linear")).toBe(0);
    expect(fadeGain(2, "smooth")).toBeCloseTo(1, 12);
  });
});

describe("planFade", () => {
  it("converts seconds to whole frames", () => {
    expect(planFade(1000, 100, { fadeInSeconds: 2, fadeOutSeconds: 1.5, curve: "linear" })).toEqual({ ok: true, fadeInFrames: 200, fadeOutFrames: 150 });
  });

  it("accepts fades that exactly fill the clip", () => {
    expect(planFade(1000, 100, { fadeInSeconds: 5, fadeOutSeconds: 5, curve: "linear" }).ok).toBe(true);
  });

  it("rejects fades that overlap, negative or non-numeric lengths, and over-long fades", () => {
    const overlap = planFade(1000, 100, { fadeInSeconds: 6, fadeOutSeconds: 5, curve: "linear" });
    expect(!overlap.ok && overlap.error).toMatch(/longer than the clip/);
    expect(planFade(1000, 100, { fadeInSeconds: -1, fadeOutSeconds: 0, curve: "linear" }).ok).toBe(false);
    expect(planFade(1000, 100, { fadeInSeconds: Number.NaN, fadeOutSeconds: 0, curve: "linear" }).ok).toBe(false);
    const tooLong = planFade(1e9, 100, { fadeInSeconds: maxFadeSeconds + 1, fadeOutSeconds: 0, curve: "linear" });
    expect(!tooLong.ok && tooLong.error).toMatch(/at most 60 seconds/);
  });
});

describe("envelopeAt", () => {
  it("starts silent, reaches full level after the fade-in, and ends silent", () => {
    expect(envelopeAt(0, 100, 10, 10, "linear")).toBe(0);
    expect(envelopeAt(10, 100, 10, 10, "linear")).toBe(1);
    expect(envelopeAt(50, 100, 10, 10, "linear")).toBe(1);
    expect(envelopeAt(99, 100, 10, 10, "linear")).toBe(0);
  });
});

describe("applyFade", () => {
  it("applies a linear fade-in sample by sample", () => {
    const result = applyFade(makeSource([constant(20)]), { fadeInSeconds: 0.1, fadeOutSeconds: 0, curve: "linear" });
    if (!result.ok) throw new Error(result.error);
    const out = result.output.getChannelData(0);

    expect(result.fadeInFrames).toBe(10);
    for (let index = 0; index < 10; index += 1) expect(out[index]).toBeCloseTo(index / 10, 6);
    for (let index = 10; index < 20; index += 1) expect(out[index]).toBe(1);
  });

  it("applies a linear fade-out ending in silence", () => {
    const result = applyFade(makeSource([constant(20)]), { fadeInSeconds: 0, fadeOutSeconds: 0.1, curve: "linear" });
    if (!result.ok) throw new Error(result.error);
    const out = result.output.getChannelData(0);

    for (let index = 0; index < 10; index += 1) expect(out[index]).toBe(1);
    for (let index = 10; index < 20; index += 1) expect(out[index]).toBeCloseTo((19 - index) / 10, 6);
    expect(out[19]).toBe(0);
  });

  it("combines a fade-in and a fade-out and leaves the middle untouched", () => {
    const source = constant(100, 0.5);
    const result = applyFade(makeSource([source]), { fadeInSeconds: 0.2, fadeOutSeconds: 0.3, curve: "linear" });
    if (!result.ok) throw new Error(result.error);
    const out = result.output.getChannelData(0);

    expect(out[0]).toBe(0);
    expect(out[99]).toBe(0);
    for (let index = 20; index < 70; index += 1) expect(out[index]).toBe(0.5);
    expect(out[10]).toBeCloseTo(0.25, 6);
  });

  it("works when the fades exactly fill the clip, without overlapping", () => {
    const result = applyFade(makeSource([constant(10)]), { fadeInSeconds: 0.05, fadeOutSeconds: 0.05, curve: "linear" });
    if (!result.ok) throw new Error(result.error);
    const out = Array.from(result.output.getChannelData(0));
    expect(out[0]).toBe(0);
    expect(out[9]).toBe(0);
    expect(Math.max(...out)).toBeLessThanOrEqual(1);
    expect(out.every((value) => value >= 0)).toBe(true);
  });

  it.each(fadeCurves.map((curve) => curve.value))("%s fade is monotonic and bounded", (curve: FadeCurve) => {
    const result = applyFade(makeSource([constant(1000)]), { fadeInSeconds: 5, fadeOutSeconds: 5, curve });
    if (!result.ok) throw new Error(result.error);
    const out = result.output.getChannelData(0);
    for (let index = 1; index < 500; index += 1) expect(out[index]).toBeGreaterThanOrEqual(out[index - 1]);
    for (let index = 501; index < 1000; index += 1) expect(out[index]).toBeLessThanOrEqual(out[index - 1]);
    expect(Math.max(...Array.from(out))).toBeLessThanOrEqual(1);
  });

  it("scales sample values and keeps their sign", () => {
    const result = applyFade(makeSource([new Float32Array([-0.8, -0.8, -0.8, -0.8, -0.8])], 10), { fadeInSeconds: 0.4, fadeOutSeconds: 0, curve: "linear" });
    if (!result.ok) throw new Error(result.error);
    const out = Array.from(result.output.getChannelData(0));
    expect(out[0]).toBeCloseTo(0, 6);
    expect(out[2]).toBeCloseTo(-0.4, 6);
    expect(out[4]).toBeCloseTo(-0.8, 6);
  });

  it("applies the same envelope to every channel", () => {
    const result = applyFade(makeSource([constant(50, 0.5), constant(50, -1)]), { fadeInSeconds: 0.2, fadeOutSeconds: 0.2, curve: "smooth" });
    if (!result.ok) throw new Error(result.error);
    const left = result.output.getChannelData(0);
    const right = result.output.getChannelData(1);
    for (let index = 0; index < 50; index += 1) expect(left[index]).toBeCloseTo(-0.5 * right[index], 6);
  });

  it("returns the source unchanged when there is nothing to fade", () => {
    const source = makeSource([constant(10)]);
    const result = applyFade(source, { fadeInSeconds: 0, fadeOutSeconds: 0, curve: "linear" });
    expect(result.ok && result.output).toBe(source);
  });

  it("keeps length, sample rate and channel count, and never modifies the input", () => {
    const channel = constant(30, 0.7);
    const snapshot = Array.from(channel);
    const result = applyFade(makeSource([channel], 48000), { fadeInSeconds: 0.0002, fadeOutSeconds: 0.0002, curve: "linear" });
    if (!result.ok) throw new Error(result.error);

    expect(result.output.length).toBe(30);
    expect(result.output.sampleRate).toBe(48000);
    expect(result.output.numberOfChannels).toBe(1);
    expect(Array.from(channel)).toEqual(snapshot);
    expect(result.output.getChannelData(0)).not.toBe(channel);
  });

  it("rejects overlapping fades and leaves the source alone", () => {
    const result = applyFade(makeSource([constant(10)]), { fadeInSeconds: 0.08, fadeOutSeconds: 0.08, curve: "linear" });
    expect(result.ok).toBe(false);
  });

  it("handles a clip shorter than a single fade and an empty clip", () => {
    expect(applyFade(makeSource([constant(5)]), { fadeInSeconds: 1, fadeOutSeconds: 0, curve: "linear" }).ok).toBe(false);
    const empty = applyFade(makeSource([new Float32Array(0)]), { fadeInSeconds: 0, fadeOutSeconds: 0, curve: "linear" });
    expect(empty.ok).toBe(true);
  });
});
