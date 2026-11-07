import type { PcmSource } from "./types";

/**
 * Reverses audio so it plays back to front: the last frame becomes the first. All channels are
 * reversed together, so stereo placement and the timing between channels are preserved. Duration,
 * sample rate and channel count never change, and the source's own data is never modified.
 */
export function reversePcmSource(source: PcmSource): PcmSource {
  const channelData: Float32Array[] = [];

  for (let channel = 0; channel < source.numberOfChannels; channel += 1) {
    const input = source.getChannelData(channel);
    const output = new Float32Array(input.length);
    const last = input.length - 1;

    for (let index = 0; index <= last; index += 1) {
      output[index] = input[last - index];
    }

    channelData.push(output);
  }

  return {
    sampleRate: source.sampleRate,
    numberOfChannels: source.numberOfChannels,
    length: channelData[0]?.length ?? 0,
    getChannelData: (channel: number) => channelData[channel],
  };
}
