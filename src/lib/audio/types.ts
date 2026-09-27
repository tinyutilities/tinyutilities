/**
 * The minimal shape every audio utility in this module actually needs — structurally
 * compatible with the real `AudioBuffer`, so decoded audio can be passed in directly, but also
 * satisfiable by a plain object in tests without needing a real AudioContext (unavailable in
 * Node/test environments).
 */
export type PcmSource = {
  readonly sampleRate: number;
  readonly numberOfChannels: number;
  readonly length: number;
  getChannelData(channel: number): Float32Array;
};

export type TimeSelection = {
  /** Selection start, in seconds. */
  start: number;
  /** Selection end, in seconds. */
  end: number;
};
