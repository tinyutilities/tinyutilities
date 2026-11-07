import { describe, expect, it } from "vitest";
import { reversePcmSource } from "./reverse";
import type { PcmSource } from "./types";

function makeSource(channels: Float32Array[], sampleRate = 44100): PcmSource {
  return {
    sampleRate,
    numberOfChannels: channels.length,
    length: channels[0]?.length ?? 0,
    getChannelData: (channel: number) => channels[channel],
  };
}

describe("reversePcmSource", () => {
  it("plays the samples back to front", () => {
    const result = reversePcmSource(makeSource([new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5])]));
    expect(Array.from(result.getChannelData(0))).toEqual(Array.from(new Float32Array([0.5, 0.4, 0.3, 0.2, 0.1])));
  });

  it("reverses every channel and keeps the channels aligned with each other", () => {
    const left = new Float32Array([1, 2, 3, 4]).map((v) => v / 10);
    const right = new Float32Array([-1, -2, -3, -4]).map((v) => v / 10);
    const result = reversePcmSource(makeSource([left, right]));

    expect(Array.from(result.getChannelData(0))).toEqual(Array.from(left).reverse());
    expect(Array.from(result.getChannelData(1))).toEqual(Array.from(right).reverse());
    for (let index = 0; index < 4; index += 1) {
      expect(result.getChannelData(0)[index]).toBeCloseTo(-result.getChannelData(1)[index], 6);
    }
  });

  it("keeps length, sample rate and channel count", () => {
    const result = reversePcmSource(makeSource([new Float32Array(1000), new Float32Array(1000), new Float32Array(1000)], 22050));
    expect(result.length).toBe(1000);
    expect(result.sampleRate).toBe(22050);
    expect(result.numberOfChannels).toBe(3);
  });

  it("is its own inverse", () => {
    const original = new Float32Array(257).map((_, index) => Math.sin(index / 7));
    const twice = reversePcmSource(reversePcmSource(makeSource([original])));
    expect(Array.from(twice.getChannelData(0))).toEqual(Array.from(original));
  });

  it("does not change any sample value, so the peak level is unchanged", () => {
    const original = new Float32Array([0.25, -0.9, 0.5, 0.7]);
    const result = reversePcmSource(makeSource([original]));
    expect(Math.max(...Array.from(result.getChannelData(0)).map(Math.abs))).toBe(Math.fround(0.9));
    expect(Array.from(result.getChannelData(0)).sort()).toEqual(Array.from(original).sort());
  });

  it("never modifies the input", () => {
    const original = new Float32Array([0.1, 0.2, 0.3]);
    const snapshot = Array.from(original);
    const result = reversePcmSource(makeSource([original]));
    expect(Array.from(original)).toEqual(snapshot);
    expect(result.getChannelData(0)).not.toBe(original);
  });

  it("handles one-sample and empty clips", () => {
    expect(Array.from(reversePcmSource(makeSource([new Float32Array([0.5])])).getChannelData(0))).toEqual([0.5]);
    const empty = reversePcmSource(makeSource([new Float32Array(0)]));
    expect(empty.length).toBe(0);
  });

  it("handles a source with no channels", () => {
    const none = reversePcmSource({ sampleRate: 44100, numberOfChannels: 0, length: 0, getChannelData: () => new Float32Array(0) });
    expect(none.length).toBe(0);
    expect(none.numberOfChannels).toBe(0);
  });
});
