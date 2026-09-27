"use client";

import type { PcmSource } from "./types";

type OfflineAudioContextWindow = Window & { webkitOfflineAudioContext?: typeof OfflineAudioContext };

/** Materializes any `PcmSource` as a real `AudioBuffer` — needed wherever a browser API (an
 *  `AudioBufferSourceNode` for playback, an `OfflineAudioContext` render source) requires the
 *  genuine class instance rather than just something structurally compatible with it. */
export function toAudioBuffer(source: PcmSource): AudioBuffer {
  if (source instanceof AudioBuffer) return source;

  const buffer = new AudioBuffer({
    numberOfChannels: source.numberOfChannels,
    length: source.length,
    sampleRate: source.sampleRate,
  });

  for (let channel = 0; channel < source.numberOfChannels; channel += 1) {
    // The cast narrows past `ArrayBufferLike`, which `copyToChannel`'s stricter modern type no
    // longer accepts directly — the data itself is always a real, freshly-read Float32Array.
    buffer.copyToChannel(source.getChannelData(channel) as Float32Array<ArrayBuffer>, channel);
  }

  return buffer;
}

/**
 * Resamples a decoded audio source to `targetSampleRate` using an `OfflineAudioContext` —
 * playing the source through a context rendered at the target rate is the standard, correct way
 * to resample with Web Audio; the browser's own audio pipeline does the actual interpolation,
 * so this never "simply reinterprets" samples at the wrong rate. Returns the source unchanged
 * (no rendering pass at all) when the rates already match.
 *
 * This genuinely requires a browser (`OfflineAudioContext` doesn't exist in Node/Vitest), which
 * is why it's kept separate from the pure, unit-tested logic in `join.ts`.
 */
export async function resamplePcmSource(source: PcmSource, targetSampleRate: number): Promise<PcmSource> {
  if (source.sampleRate === targetSampleRate) {
    return source;
  }

  const OfflineCtor = window.OfflineAudioContext || (window as OfflineAudioContextWindow).webkitOfflineAudioContext;
  if (!OfflineCtor) {
    throw new Error("Your browser doesn't support the audio resampling this tool requires.");
  }

  const targetLength = Math.max(1, Math.ceil((source.length * targetSampleRate) / source.sampleRate));
  const offlineContext = new OfflineCtor(source.numberOfChannels, targetLength, targetSampleRate);

  const bufferSource = offlineContext.createBufferSource();
  bufferSource.buffer = toAudioBuffer(source);
  bufferSource.connect(offlineContext.destination);
  bufferSource.start(0);

  return offlineContext.startRendering();
}
