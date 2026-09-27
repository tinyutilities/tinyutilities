import type { PcmSource } from "./types";

/**
 * Volume-change math and sample processing — pure, framework-free, and fully unit-testable.
 * Unlike speed changing, applying gain is just per-sample multiplication (no resampling), so
 * this module needs no browser API at all — everything here runs in Node/Vitest directly.
 */

export const minDb = -12;
export const maxDb = 12;

/** The quick-pick dB buttons shown in the UI, in display order. */
export const dbPresets = [-12, -6, -3, 0, 3, 6, 12] as const;

export function isDbValid(db: number): boolean {
  return Number.isFinite(db) && db >= minDb && db <= maxDb;
}

export function clampDb(db: number): number {
  if (!Number.isFinite(db)) return 0;
  return Math.min(maxDb, Math.max(minDb, db));
}

/** Standard dB-to-linear-amplitude conversion: gain = 10^(dB/20). 0 dB is always exactly 1×
 *  (not an approximation), since `10 ** 0 === 1`. */
export function dbToGain(db: number): number {
  if (!Number.isFinite(db)) return 1;
  return Math.pow(10, db / 20);
}

/** The largest absolute sample value across every channel — the single number that determines
 *  whether a given gain will clip (see `willClip`). Returns 0 for silence or an empty source. */
export function computePeakAmplitude(source: PcmSource): number {
  let peak = 0;
  for (let channel = 0; channel < source.numberOfChannels; channel += 1) {
    const data = source.getChannelData(channel);
    for (let i = 0; i < data.length; i += 1) {
      const abs = Math.abs(data[i]);
      if (abs > peak) peak = abs;
    }
  }
  return peak;
}

/** What the loudest sample WOULD reach after applying `gain`, before any clamping — this is a
 *  prediction from the decoded PCM data, not a perceptual loudness claim. */
export function predictOutputPeak(sourcePeak: number, gain: number): number {
  if (!Number.isFinite(sourcePeak) || !Number.isFinite(gain)) return 0;
  return Math.max(0, sourcePeak) * Math.max(0, gain);
}

/** True exactly when the predicted output peak exceeds the [-1, 1] ceiling — the same condition
 *  that determines whether `applyGainToPcmSource` will actually clamp any sample, since the
 *  peak is by definition the loudest sample, and every other sample scales by the same gain. */
export function willClip(sourcePeak: number, gain: number): boolean {
  return predictOutputPeak(sourcePeak, gain) > 1;
}

/** Scales a single sample by `gain` and clamps it into the valid [-1, 1] range — the same
 *  clamp-before-encode strategy `encodeWav` already uses for its own float-to-int16 step, but
 *  applied here explicitly so the returned PCM itself is always in-range, not just the WAV
 *  bytes downstream of it. */
export function applyGainToSample(sample: number, gain: number): number {
  const scaled = sample * gain;
  return Math.max(-1, Math.min(1, scaled));
}

export type GainedPcm = {
  sampleRate: number;
  numberOfChannels: number;
  channelData: Float32Array[];
};

/** Applies `gain` to every sample of every channel, clamping each into [-1, 1] as it goes.
 *  Never mutates the source's own channel data — always allocates fresh `Float32Array`s, so the
 *  original decoded buffer stays untouched no matter how many times this is called. Duration,
 *  sample rate, and channel count are always preserved exactly. */
export function applyGainToPcm(source: PcmSource, gain: number): GainedPcm {
  const channelData: Float32Array[] = [];

  for (let channel = 0; channel < source.numberOfChannels; channel += 1) {
    const input = source.getChannelData(channel);
    const output = new Float32Array(input.length);
    for (let i = 0; i < input.length; i += 1) {
      output[i] = applyGainToSample(input[i], gain);
    }
    channelData.push(output);
  }

  return { sampleRate: source.sampleRate, numberOfChannels: source.numberOfChannels, channelData };
}

/** Wraps `applyGainToPcm`'s result back up as a `PcmSource`, so it can go straight into
 *  `encodeWavBlob` the same way any other decoded/processed buffer in this module does. */
export function applyGainToPcmSource(source: PcmSource, gain: number): PcmSource {
  const gained = applyGainToPcm(source, gain);
  return {
    sampleRate: gained.sampleRate,
    numberOfChannels: gained.numberOfChannels,
    length: gained.channelData[0]?.length ?? 0,
    getChannelData: (channel: number) => gained.channelData[channel],
  };
}
