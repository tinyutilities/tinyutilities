import type { PcmSource } from "./types";

/**
 * This encoder deliberately always outputs 16-bit signed PCM, regardless of the source's
 * internal float precision. 16-bit PCM WAV is universally playable (every OS, DAW, and browser
 * opens it without question), and the size/quality tradeoff is the right default for a "trim an
 * audio clip" tool — this is documented in the tool's UI rather than left as a silent choice.
 */
export const outputBitsPerSample = 16;

export type EncodeWavOptions = {
  /** First frame (inclusive) to include, in samples. Defaults to 0. */
  startFrame?: number;
  /** Last frame (exclusive) to include, in samples. Defaults to `source.length`. */
  endFrame?: number;
};

/**
 * Encodes a `PcmSource` (or a [startFrame, endFrame) slice of one) as a standard 16-bit PCM WAV
 * file, returned as raw bytes. Channel count and sample rate are preserved from the source
 * exactly — only bit depth is normalized (see `outputBitsPerSample`).
 *
 * Float samples are clamped to [-1, 1] before conversion so an out-of-range source sample
 * (Web Audio permits this after gain/processing) wraps around into noise instead of clipping
 * safely to full scale.
 */
export function encodeWav(source: PcmSource, options: EncodeWavOptions = {}): Uint8Array {
  const { numberOfChannels, sampleRate } = source;
  const startFrame = Math.max(0, Math.floor(options.startFrame ?? 0));
  const endFrame = Math.min(source.length, Math.floor(options.endFrame ?? source.length));
  const frameCount = Math.max(0, endFrame - startFrame);

  const bytesPerSample = outputBitsPerSample / 8;
  const blockAlign = numberOfChannels * bytesPerSample;
  const dataSize = frameCount * blockAlign;
  const byteRate = sampleRate * blockAlign;

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, "WAVE");

  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true); // fmt chunk size (16 for PCM)
  view.setUint16(20, 1, true); // audio format: 1 = PCM
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, outputBitsPerSample, true);

  writeAscii(view, 36, "data");
  view.setUint32(40, dataSize, true);

  const channelData: Float32Array[] = [];
  for (let channel = 0; channel < numberOfChannels; channel += 1) {
    channelData.push(source.getChannelData(channel));
  }

  let offset = 44;
  for (let frame = startFrame; frame < endFrame; frame += 1) {
    for (let channel = 0; channel < numberOfChannels; channel += 1) {
      const clamped = Math.max(-1, Math.min(1, channelData[channel][frame] ?? 0));
      // Standard float-to-int16 scaling: negative range is one step wider ([-32768, 32767]),
      // so the negative and positive sides use slightly different multipliers to land exactly
      // on the representable extremes without ever overshooting into wraparound.
      const int16Sample = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
      view.setInt16(offset, Math.round(int16Sample), true);
      offset += 2;
    }
  }

  return new Uint8Array(buffer);
}

/** Convenience wrapper for browser call sites — same encoding, returned as a downloadable Blob. */
export function encodeWavBlob(source: PcmSource, options: EncodeWavOptions = {}): Blob {
  const bytes = encodeWav(source, options);
  // `bytes.buffer` is always a plain ArrayBuffer here (it was just allocated with
  // `new ArrayBuffer(...)` above) — the cast just narrows past `ArrayBufferLike`, which
  // TypeScript's `BlobPart` type no longer accepts directly.
  return new Blob([bytes.buffer as ArrayBuffer], { type: "audio/wav" });
}

function writeAscii(view: DataView, offset: number, text: string) {
  for (let i = 0; i < text.length; i += 1) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
}
