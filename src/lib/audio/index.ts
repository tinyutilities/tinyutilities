export { decodeAudioFile } from "./decode";
export type { DecodeAudioResult, DecodeAudioError } from "./decode";
export { encodeWav, encodeWavBlob, outputBitsPerSample } from "./wav-encoder";
export type { EncodeWavOptions } from "./wav-encoder";
export { clampSelection, fullSelection, formatTime, parseTimeInput, minSelectionDuration } from "./selection";
export { computeWaveformPeaks } from "./waveform";
export type { WaveformPeaks } from "./waveform";
export {
  estimateDecodedPcmBytes,
  isDecodedSizeSafe,
  isTotalDecodedSizeSafe,
  maxUploadFileBytes,
  maxDecodedPcmBytes,
  maxJoinInputFiles,
  decodedBytesPerSample,
} from "./memory-guard";
export { useAudioPlayback } from "./use-audio-playback";
export {
  concatenatePcm,
  concatenatePcmSource,
  remapPcmChannels,
  isChannelCountJoinable,
  maxJoinableChannels,
  joinPcmSources,
} from "./join";
export type { JoinStage } from "./join";
export { resamplePcmSource, toAudioBuffer } from "./resample";
export { moveItem, removeItem } from "./reorder";
export {
  clampSpeed,
  computeOutputDuration,
  estimateSpeedOutputBytes,
  isSpeedValid,
  maxSpeed,
  minSpeed,
  speedPresets,
} from "./speed";
export { changeAudioSpeed } from "./speed-processor";
export {
  applyGainToPcm,
  applyGainToPcmSource,
  applyGainToSample,
  clampDb,
  computePeakAmplitude,
  dbPresets,
  dbToGain,
  isDbValid,
  maxDb,
  minDb,
  predictOutputPeak,
  willClip,
} from "./volume";
export type { GainedPcm } from "./volume";
export type { PcmSource, TimeSelection } from "./types";
export {
  amplitudeToDbfs,
  dbfsToAmplitude,
  defaultNormalizeTargetDb,
  isNormalizeTargetValid,
  largeBoostWarningDb,
  maxNormalizeTargetDb,
  minNormalizeTargetDb,
  normalizePcmSource,
  normalizeTargetPresets,
  planNormalization,
} from "./normalize";
export type { NormalizePlan, NormalizeResult } from "./normalize";
export { reversePcmSource } from "./reverse";
export { applyFade, envelopeAt, fadeCurves, fadeGain, maxFadeSeconds, planFade } from "./fade";
export type { FadeCurve, FadeOptions, FadePlan, FadeResult } from "./fade";
