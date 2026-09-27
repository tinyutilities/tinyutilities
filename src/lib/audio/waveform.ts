import type { PcmSource } from "./types";

export type WaveformPeaks = {
  /** One entry per bucket: the most negative sample in that bucket (mixed down across channels). */
  min: Float32Array;
  /** One entry per bucket: the most positive sample in that bucket (mixed down across channels). */
  max: Float32Array;
};

/**
 * Downsamples a decoded audio source into `bucketCount` min/max peak pairs — the standard
 * approach for rendering a waveform of arbitrary length onto a fixed-width canvas without ever
 * touching one DOM node (or even one drawn segment) per sample. Channels are mixed down to a
 * single averaged waveform: for a "trim a clip" tool, one clear envelope reads better than
 * stacking separate per-channel waveforms, and every sample is still included in the average
 * rather than dropped.
 *
 * Runs in a single pass over the audio (no repeated scans), so it stays fast even for long
 * files, and never produces NaN/Infinity: an empty or all-silent source simply yields zeros.
 */
export function computeWaveformPeaks(source: PcmSource, bucketCount: number): WaveformPeaks {
  const buckets = Math.max(1, Math.floor(bucketCount));
  const min = new Float32Array(buckets);
  const max = new Float32Array(buckets);

  const { length, numberOfChannels } = source;

  if (length === 0 || numberOfChannels === 0) {
    return { min, max };
  }

  const channelData: Float32Array[] = [];
  for (let channel = 0; channel < numberOfChannels; channel += 1) {
    channelData.push(source.getChannelData(channel));
  }

  const framesPerBucket = length / buckets;
  let bucketMin = Infinity;
  let bucketMax = -Infinity;
  let nextBucketBoundary = framesPerBucket;
  let bucketIndex = 0;

  for (let frame = 0; frame < length; frame += 1) {
    let sum = 0;
    for (let channel = 0; channel < numberOfChannels; channel += 1) {
      sum += channelData[channel][frame];
    }
    const mixed = sum / numberOfChannels;

    if (mixed < bucketMin) bucketMin = mixed;
    if (mixed > bucketMax) bucketMax = mixed;

    if (frame + 1 >= nextBucketBoundary || frame === length - 1) {
      min[bucketIndex] = bucketMin === Infinity ? 0 : bucketMin;
      max[bucketIndex] = bucketMax === -Infinity ? 0 : bucketMax;

      bucketIndex += 1;
      bucketMin = Infinity;
      bucketMax = -Infinity;
      nextBucketBoundary += framesPerBucket;

      if (bucketIndex >= buckets) break;
    }
  }

  // Any trailing buckets that never got a frame (can happen when `buckets > length`) stay at
  // the Float32Array default of 0, which is correct — there was no audio to represent there.
  return { min, max };
}
