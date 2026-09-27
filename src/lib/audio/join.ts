"use client";

import { resamplePcmSource } from "./resample";
import type { PcmSource } from "./types";

/** This tool supports mono and stereo audio only. Anything with more channels is rejected with a
 *  clear message at the point a file is added, rather than attempting a generalized N-channel
 *  downmix that could silently produce a wrong-sounding result. */
export const maxJoinableChannels = 2;

export function isChannelCountJoinable(channels: number): boolean {
  return channels >= 1 && channels <= maxJoinableChannels;
}

/**
 * Concatenates PCM sources that already share the same sample rate and channel count into one
 * continuous buffer — the actual boundary-correctness logic (no dropped samples, no silence
 * gaps, no duplicated samples, no overlap between tracks). Each segment is copied into the
 * output at the exact cumulative sample offset of everything before it, via `TypedArray.set`,
 * which is the only way this could produce a gap or overlap is a bug in the offset arithmetic
 * itself — there's no windowing, fading, or resampling happening here to introduce drift.
 *
 * Deliberately separate from resampling (which needs a real `OfflineAudioContext` and can't run
 * outside a browser) so this — the part most at risk of an off-by-one bug — can be unit tested
 * directly with plain objects, no browser required.
 */
export function concatenatePcm(segments: PcmSource[]): {
  sampleRate: number;
  numberOfChannels: number;
  channelData: Float32Array[];
} {
  if (segments.length === 0) {
    return { sampleRate: 0, numberOfChannels: 0, channelData: [] };
  }

  const { sampleRate, numberOfChannels } = segments[0];
  const totalLength = segments.reduce((sum, segment) => sum + segment.length, 0);
  const channelData = Array.from({ length: numberOfChannels }, () => new Float32Array(totalLength));

  let offset = 0;
  for (const segment of segments) {
    for (let channel = 0; channel < numberOfChannels; channel += 1) {
      channelData[channel].set(segment.getChannelData(channel), offset);
    }
    offset += segment.length;
  }

  return { sampleRate, numberOfChannels, channelData };
}

/** Same as `concatenatePcm`, wrapped as a `PcmSource` so the result can be handed directly to
 *  `encodeWav`/`encodeWavBlob` or played back like any other decoded source. */
export function concatenatePcmSource(segments: PcmSource[]): PcmSource {
  const { sampleRate, numberOfChannels, channelData } = concatenatePcm(segments);
  return {
    sampleRate,
    numberOfChannels,
    length: channelData[0]?.length ?? 0,
    getChannelData: (channel: number) => channelData[channel],
  };
}

/**
 * Converts a source to exactly `targetChannels` (1 or 2) channels:
 *  - same count: returned unchanged.
 *  - down to mono: every channel is averaged together (a true downmix, not just discarding the
 *    other channel).
 *  - up to stereo: the mono signal is duplicated into both output channels — silence is never
 *    introduced on the second channel.
 * Sources with more than `maxJoinableChannels` channels are expected to have already been
 * rejected before reaching this function (see `isChannelCountJoinable`).
 */
export function remapPcmChannels(source: PcmSource, targetChannels: 1 | 2): PcmSource {
  if (source.numberOfChannels === targetChannels) {
    return source;
  }

  if (targetChannels === 1) {
    const mixed = new Float32Array(source.length);
    const channels: Float32Array[] = [];
    for (let channel = 0; channel < source.numberOfChannels; channel += 1) {
      channels.push(source.getChannelData(channel));
    }

    for (let i = 0; i < source.length; i += 1) {
      let sum = 0;
      for (const channelData of channels) {
        sum += channelData[i];
      }
      mixed[i] = sum / channels.length;
    }

    return { sampleRate: source.sampleRate, numberOfChannels: 1, length: source.length, getChannelData: () => mixed };
  }

  // targetChannels === 2 and source is mono (the only case that reaches here, since anything
  // wider than stereo is rejected earlier and stereo-to-stereo already returned above).
  const mono = source.getChannelData(0);
  return {
    sampleRate: source.sampleRate,
    numberOfChannels: 2,
    length: source.length,
    getChannelData: () => mono,
  };
}

export type JoinStage = "preparing" | "resampling" | "joining";

/**
 * Full pipeline for turning several decoded sources into one: the FIRST source's sample rate
 * and (clamped-to-stereo) channel count become the output format, every source is resampled and
 * channel-remapped to match it, and the results are concatenated in order with no gaps or
 * overlap. This is the one function Audio Joiner actually calls; it composes the pure functions
 * above with the browser-only `resamplePcmSource`, so it needs a real browser itself, but the
 * boundary-correctness logic it delegates to (`concatenatePcm`) is independently tested.
 */
export async function joinPcmSources(
  sources: PcmSource[],
  onProgress?: (stage: JoinStage) => void,
): Promise<PcmSource> {
  if (sources.length < 2) {
    throw new Error("Add at least two audio files to join.");
  }

  onProgress?.("preparing");

  const targetSampleRate = sources[0].sampleRate;
  const targetChannels: 1 | 2 = sources[0].numberOfChannels >= 2 ? 2 : 1;

  onProgress?.("resampling");
  const resampled = await Promise.all(sources.map((source) => resamplePcmSource(source, targetSampleRate)));
  const remapped = resampled.map((source) => remapPcmChannels(source, targetChannels));

  onProgress?.("joining");
  return concatenatePcmSource(remapped);
}
