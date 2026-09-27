"use client";

import { isSpeedValid } from "./speed";
import { toAudioBuffer } from "./resample";
import type { PcmSource } from "./types";

type OfflineAudioContextWindow = Window & { webkitOfflineAudioContext?: typeof OfflineAudioContext };

/**
 * Changes playback speed by literally playing the source through an `OfflineAudioContext` at a
 * different `playbackRate` — the same mechanism a native `<audio>` element uses for its own
 * `playbackRate`, so pitch shifts exactly the way a user already expects from "speed" controls
 * (this is deliberately NOT pitch-preserving time-stretching; see the tool's UI copy). The
 * output sample rate is kept identical to the source's — only the number of samples changes, to
 * span the newly (shorter or longer) resulting duration.
 *
 * Genuinely requires a browser (`OfflineAudioContext`), so — like `resamplePcmSource` — this is
 * kept out of the pure, Vitest-tested `speed.ts` module.
 */
export async function changeAudioSpeed(source: PcmSource, speed: number): Promise<PcmSource> {
  if (!isSpeedValid(speed)) {
    throw new Error("Choose a speed between 0.5x and 2x.");
  }

  if (speed === 1) {
    return source;
  }

  const OfflineCtor = window.OfflineAudioContext || (window as OfflineAudioContextWindow).webkitOfflineAudioContext;
  if (!OfflineCtor) {
    throw new Error("Your browser doesn't support the audio processing this tool requires.");
  }

  const outputLength = Math.max(1, Math.round(source.length / speed));
  const offlineContext = new OfflineCtor(source.numberOfChannels, outputLength, source.sampleRate);

  const bufferSource = offlineContext.createBufferSource();
  bufferSource.buffer = toAudioBuffer(source);
  bufferSource.playbackRate.value = speed;
  bufferSource.connect(offlineContext.destination);
  bufferSource.start(0);

  return offlineContext.startRendering();
}
