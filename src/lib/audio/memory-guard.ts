/**
 * All Audio Tools size/memory limits, in one place so they're easy to revisit later. Decoded
 * PCM audio is held entirely in memory as 32-bit floats per sample per channel — a compressed
 * file's size on disk says very little about that footprint (a small MP3 can decode to a huge
 * buffer), so both a pre-decode file-size sanity check and a post-decode PCM estimate are
 * enforced. Shared by every Audio Tool (Trimmer, Joiner, and future ones).
 */

/** Reject a file before even attempting to decode it if it's already implausibly large. */
export const maxUploadFileBytes = 300 * 1024 * 1024; // 300 MB

/** Reject a decoded buffer whose estimated PCM footprint exceeds this, regardless of how small
 *  the original compressed file was. */
export const maxDecodedPcmBytes = 700 * 1024 * 1024; // 700 MB

/** Bytes per sample for a decoded Web Audio API buffer (32-bit float, always — decodeAudioData
 *  never returns anything else). */
export const decodedBytesPerSample = 4;

/** channels × sampleRate × duration × bytesPerSample — the exact footprint of the Float32Array
 *  data a decoded AudioBuffer holds. */
export function estimateDecodedPcmBytes(channels: number, sampleRate: number, durationSeconds: number): number {
  if (!Number.isFinite(channels) || !Number.isFinite(sampleRate) || !Number.isFinite(durationSeconds)) {
    return 0;
  }

  return Math.max(0, channels) * Math.max(0, sampleRate) * Math.max(0, durationSeconds) * decodedBytesPerSample;
}

export function isDecodedSizeSafe(channels: number, sampleRate: number, durationSeconds: number): boolean {
  return estimateDecodedPcmBytes(channels, sampleRate, durationSeconds) <= maxDecodedPcmBytes;
}

/** A generous but real ceiling on how many files a multi-file Audio Tool (e.g. Audio Joiner)
 *  will accept — comfortably enough for joining a stack of voice memos or podcast segments,
 *  while still bounding how many decoded `AudioBuffer`s can be alive in memory at once. */
export const maxJoinInputFiles = 50;

/** Same budget as `isDecodedSizeSafe`, applied to the SUM of several files' estimated PCM
 *  footprints — each individual file can pass its own per-file check while a large enough
 *  collection of them still exceeds what the browser tab can hold at once (every decoded buffer
 *  must coexist in memory simultaneously while joining). */
export function isTotalDecodedSizeSafe(estimatesBytes: number[]): boolean {
  const total = estimatesBytes.reduce((sum, bytes) => sum + (Number.isFinite(bytes) ? bytes : 0), 0);
  return total <= maxDecodedPcmBytes;
}
