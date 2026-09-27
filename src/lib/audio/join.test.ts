import { describe, expect, it } from "vitest";
import { concatenatePcm, concatenatePcmSource, isChannelCountJoinable, joinPcmSources, maxJoinableChannels, remapPcmChannels } from "./join";
import { encodeWav } from "./wav-encoder";
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

describe("concatenatePcm", () => {
  it("joins two mono files with no gap or overlap", () => {
    const a = makeSource([[1, 2, 3]]);
    const b = makeSource([[4, 5]]);
    const { channelData, numberOfChannels } = concatenatePcm([a, b]);

    expect(numberOfChannels).toBe(1);
    expect(Array.from(channelData[0])).toEqual([1, 2, 3, 4, 5]);
  });

  it("joins two stereo files, preserving both channels independently", () => {
    const a = makeSource([[1, 1], [2, 2]]);
    const b = makeSource([[9, 9], [8, 8]]);
    const { channelData } = concatenatePcm([a, b]);

    expect(Array.from(channelData[0])).toEqual([1, 1, 9, 9]);
    expect(Array.from(channelData[1])).toEqual([2, 2, 8, 8]);
  });

  it("joins three files in the given order", () => {
    const a = makeSource([[1]]);
    const b = makeSource([[2]]);
    const c = makeSource([[3]]);
    const { channelData } = concatenatePcm([a, b, c]);

    expect(Array.from(channelData[0])).toEqual([1, 2, 3]);
  });

  it("handles files of different durations without dropping or duplicating samples", () => {
    const short = makeSource([[1]]);
    const long = makeSource([[2, 3, 4, 5, 6]]);
    const { channelData } = concatenatePcm([short, long]);

    expect(channelData[0]).toHaveLength(6);
    expect(Array.from(channelData[0])).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("joins silent segments without introducing noise", () => {
    const silence1 = makeSource([[0, 0, 0]]);
    const silence2 = makeSource([[0, 0]]);
    const { channelData } = concatenatePcm([silence1, silence2]);

    expect(Array.from(channelData[0]).every((sample) => sample === 0)).toBe(true);
  });

  it("handles very short (single-sample) clips correctly", () => {
    const a = makeSource([[0.5]]);
    const b = makeSource([[-0.5]]);
    const { channelData } = concatenatePcm([a, b]);

    expect(Array.from(channelData[0])).toEqual([0.5, -0.5]);
  });

  it("returns an empty, non-throwing result for an empty segment list", () => {
    const result = concatenatePcm([]);
    expect(result.channelData).toEqual([]);
    expect(result.numberOfChannels).toBe(0);
  });

  it("places each segment at the exact expected sample offset (boundary correctness)", () => {
    // Three distinctly-valued segments — verifies there is no off-by-one drift at either boundary.
    const segments = [makeSource([[1, 1, 1]]), makeSource([[2, 2]]), makeSource([[3, 3, 3, 3]])];
    const { channelData } = concatenatePcm(segments);
    const data = Array.from(channelData[0]);

    expect(data.slice(0, 3)).toEqual([1, 1, 1]);
    expect(data.slice(3, 5)).toEqual([2, 2]);
    expect(data.slice(5, 9)).toEqual([3, 3, 3, 3]);
    expect(data).toHaveLength(9);
  });

  it("preserves the sample rate from the first segment", () => {
    const a = makeSource([[1, 2]], 48000);
    const b = makeSource([[3, 4]], 48000);
    const { sampleRate } = concatenatePcm([a, b]);
    expect(sampleRate).toBe(48000);
  });
});

describe("concatenatePcmSource", () => {
  it("wraps the concatenated result as a valid PcmSource usable by encodeWav", () => {
    const a = makeSource([[1, 0.5]]);
    const b = makeSource([[-0.5, -1]]);
    const joined = concatenatePcmSource([a, b]);

    expect(joined.length).toBe(4);
    expect(joined.numberOfChannels).toBe(1);

    // Round-trip through the real WAV encoder to confirm the wrapper is fully compatible.
    const bytes = encodeWav(joined);
    expect(bytes.length).toBe(44 + 4 * 2);
  });
});

describe("remapPcmChannels", () => {
  it("leaves a source unchanged when it already matches the target channel count", () => {
    const stereo = makeSource([[1, 2], [3, 4]]);
    expect(remapPcmChannels(stereo, 2)).toBe(stereo);
  });

  it("downmixes stereo to mono by averaging channels", () => {
    const stereo = makeSource([[1, 1], [-1, 3]]);
    const mono = remapPcmChannels(stereo, 1);
    expect(Array.from(mono.getChannelData(0))).toEqual([0, 2]);
    expect(mono.numberOfChannels).toBe(1);
  });

  it("upmixes mono to stereo by duplicating the signal into both channels", () => {
    const mono = makeSource([[0.25, -0.75]]);
    const stereo = remapPcmChannels(mono, 2);

    expect(stereo.numberOfChannels).toBe(2);
    expect(Array.from(stereo.getChannelData(0))).toEqual([0.25, -0.75]);
    expect(Array.from(stereo.getChannelData(1))).toEqual([0.25, -0.75]);
  });
});

describe("isChannelCountJoinable", () => {
  it("accepts mono and stereo", () => {
    expect(isChannelCountJoinable(1)).toBe(true);
    expect(isChannelCountJoinable(2)).toBe(true);
    expect(maxJoinableChannels).toBe(2);
  });

  it("rejects more than stereo", () => {
    expect(isChannelCountJoinable(6)).toBe(false);
  });

  it("rejects zero/negative channel counts", () => {
    expect(isChannelCountJoinable(0)).toBe(false);
    expect(isChannelCountJoinable(-1)).toBe(false);
  });
});

describe("joinPcmSources rejection", () => {
  it("rejects an empty input list", async () => {
    await expect(joinPcmSources([])).rejects.toThrow(/at least two/i);
  });

  it("rejects a single file (nothing to join)", async () => {
    await expect(joinPcmSources([makeSource([[1, 2]])])).rejects.toThrow(/at least two/i);
  });
});
