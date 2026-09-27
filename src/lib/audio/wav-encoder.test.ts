import { describe, expect, it } from "vitest";
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

function readHeader(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const ascii = (offset: number, length: number) =>
    String.fromCharCode(...bytes.slice(offset, offset + length));

  return {
    riff: ascii(0, 4),
    chunkSize: view.getUint32(4, true),
    wave: ascii(8, 4),
    fmt: ascii(12, 4),
    fmtChunkSize: view.getUint32(16, true),
    audioFormat: view.getUint16(20, true),
    numChannels: view.getUint16(22, true),
    sampleRate: view.getUint32(24, true),
    byteRate: view.getUint32(28, true),
    blockAlign: view.getUint16(32, true),
    bitsPerSample: view.getUint16(34, true),
    dataTag: ascii(36, 4),
    dataSize: view.getUint32(40, true),
  };
}

function readSamples(bytes: Uint8Array, numChannels: number): number[][] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const dataSize = view.getUint32(40, true);
  const frameCount = dataSize / (2 * numChannels);
  const channels: number[][] = Array.from({ length: numChannels }, () => []);

  let offset = 44;
  for (let frame = 0; frame < frameCount; frame += 1) {
    for (let channel = 0; channel < numChannels; channel += 1) {
      channels[channel].push(view.getInt16(offset, true));
      offset += 2;
    }
  }

  return channels;
}

describe("encodeWav", () => {
  it("writes a valid RIFF/WAVE header", () => {
    const source = makeSource([[0, 0.5, -0.5]]);
    const bytes = encodeWav(source);
    const header = readHeader(bytes);

    expect(header.riff).toBe("RIFF");
    expect(header.wave).toBe("WAVE");
    expect(header.fmt).toBe("fmt ");
    expect(header.dataTag).toBe("data");
    expect(header.audioFormat).toBe(1);
    expect(header.fmtChunkSize).toBe(16);
    expect(header.bitsPerSample).toBe(16);
  });

  it("reports the correct sample rate", () => {
    const source = makeSource([[0, 0, 0]], 22050);
    const header = readHeader(encodeWav(source));
    expect(header.sampleRate).toBe(22050);
  });

  it("reports the correct channel count and block align for mono", () => {
    const source = makeSource([[0, 0, 0]]);
    const header = readHeader(encodeWav(source));
    expect(header.numChannels).toBe(1);
    expect(header.blockAlign).toBe(2);
  });

  it("reports the correct channel count and block align for stereo", () => {
    const source = makeSource([
      [0, 0, 0],
      [0, 0, 0],
    ]);
    const header = readHeader(encodeWav(source));
    expect(header.numChannels).toBe(2);
    expect(header.blockAlign).toBe(4);
  });

  it("computes correct data length and overall chunk size", () => {
    const source = makeSource([
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    const bytes = encodeWav(source);
    const header = readHeader(bytes);

    // 4 frames * 2 channels * 2 bytes/sample
    expect(header.dataSize).toBe(16);
    expect(header.chunkSize).toBe(36 + 16);
    expect(bytes.length).toBe(44 + 16);
  });

  it("round-trips a short mono buffer's sample values", () => {
    const source = makeSource([[0, 0.5, -0.5, 1, -1]]);
    const bytes = encodeWav(source);
    const [channel] = readSamples(bytes, 1);

    expect(channel[0]).toBe(0);
    expect(channel[1]).toBeCloseTo(16384, -1);
    expect(channel[2]).toBeCloseTo(-16384, -1);
    expect(channel[3]).toBe(32767);
    expect(channel[4]).toBe(-32768);
  });

  it("round-trips a stereo buffer with independent channel values", () => {
    const source = makeSource([
      [1, -1],
      [-1, 1],
    ]);
    const bytes = encodeWav(source);
    const [left, right] = readSamples(bytes, 2);

    expect(left).toEqual([32767, -32768]);
    expect(right).toEqual([-32768, 32767]);
  });

  it("handles silence without producing NaN or corrupt samples", () => {
    const source = makeSource([new Array(100).fill(0)]);
    const bytes = encodeWav(source);
    const [channel] = readSamples(bytes, 1);

    expect(channel.every((sample) => sample === 0)).toBe(true);
  });

  it("clamps out-of-range positive samples instead of wrapping around", () => {
    const source = makeSource([[1.5, 3, 100]]);
    const bytes = encodeWav(source);
    const [channel] = readSamples(bytes, 1);

    expect(channel.every((sample) => sample === 32767)).toBe(true);
  });

  it("clamps out-of-range negative samples instead of wrapping around", () => {
    const source = makeSource([[-1.5, -3, -100]]);
    const bytes = encodeWav(source);
    const [channel] = readSamples(bytes, 1);

    expect(channel.every((sample) => sample === -32768)).toBe(true);
  });

  it("supports more than two channels", () => {
    const source = makeSource([
      [1],
      [0],
      [-1],
      [0.5],
    ]);
    const bytes = encodeWav(source);
    const header = readHeader(bytes);
    const channels = readSamples(bytes, 4);

    expect(header.numChannels).toBe(4);
    expect(channels[0][0]).toBe(32767);
    expect(channels[1][0]).toBe(0);
    expect(channels[2][0]).toBe(-32768);
    expect(channels[3][0]).toBeCloseTo(16384, -1);
  });

  it("encodes an empty buffer as a valid zero-length WAV", () => {
    const source = makeSource([[]]);
    const bytes = encodeWav(source);
    const header = readHeader(bytes);

    expect(header.dataSize).toBe(0);
    expect(bytes.length).toBe(44);
  });

  it("encodes only the requested [startFrame, endFrame) range", () => {
    const source = makeSource([[0, 0.25, 0.5, 0.75, 1]]);
    const bytes = encodeWav(source, { startFrame: 1, endFrame: 4 });
    const header = readHeader(bytes);
    const [channel] = readSamples(bytes, 1);

    expect(header.dataSize).toBe(3 * 2);
    expect(channel).toHaveLength(3);
    expect(channel[0]).toBeCloseTo(8192, -1);
  });
});
