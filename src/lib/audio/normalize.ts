import type { PcmSource } from "./types";
import { applyGainToPcmSource, computePeakAmplitude } from "./volume";

/**
 * Peak normalization: one gain, applied to every channel alike, that brings the loudest sample to
 * a chosen level. Because every channel gets the same gain, stereo balance and the relative
 * dynamics of the recording are untouched. This is NOT loudness (LUFS) or RMS normalization: two
 * clips with the same peak can still sound very different in loudness.
 *
 * Pure and framework-free, like `volume.ts`, so it runs in Node/Vitest directly.
 */

/** Quick-pick targets in dBFS (decibels relative to digital full scale, where 0 is the maximum). */
export const normalizeTargetPresets = [0, -1, -3, -6, -12] as const;
export const minNormalizeTargetDb = -24;
export const maxNormalizeTargetDb = 0;
export const defaultNormalizeTargetDb = -1;

/** Boosts above this are flagged, because they also amplify any background noise the clip has. */
export const largeBoostWarningDb = 20;

export function isNormalizeTargetValid(targetDb: number): boolean {
  return Number.isFinite(targetDb) && targetDb >= minNormalizeTargetDb && targetDb <= maxNormalizeTargetDb;
}

/** A linear peak amplitude (0–1) expressed in dBFS. Silence is -Infinity. */
export function amplitudeToDbfs(amplitude: number): number {
  if (!Number.isFinite(amplitude) || amplitude <= 0) return Number.NEGATIVE_INFINITY;
  return 20 * Math.log10(amplitude);
}

export function dbfsToAmplitude(dbfs: number): number {
  return Math.pow(10, dbfs / 20);
}

export type NormalizePlan =
  | { ok: true; gain: number; gainDb: number; sourcePeak: number; sourcePeakDb: number; targetPeak: number; largeBoost: boolean }
  | { ok: false; reason: "silent" | "invalid-target" };

/**
 * The gain that moves a clip whose loudest sample is `sourcePeak` (linear, 0–1) to `targetDb`
 * dBFS. A silent clip has no peak to scale, so it is reported instead of dividing by zero.
 */
export function planNormalization(sourcePeak: number, targetDb: number): NormalizePlan {
  if (!isNormalizeTargetValid(targetDb)) return { ok: false, reason: "invalid-target" };
  if (!Number.isFinite(sourcePeak) || sourcePeak <= 0) return { ok: false, reason: "silent" };

  const targetPeak = dbfsToAmplitude(targetDb);
  const gain = targetPeak / sourcePeak;
  const gainDb = 20 * Math.log10(gain);

  return {
    ok: true,
    gain,
    gainDb,
    sourcePeak,
    sourcePeakDb: amplitudeToDbfs(sourcePeak),
    targetPeak,
    largeBoost: gainDb > largeBoostWarningDb,
  };
}

export type NormalizeResult = { plan: Extract<NormalizePlan, { ok: true }>; output: PcmSource; outputPeak: number } | { plan: Extract<NormalizePlan, { ok: false }> };

/** Normalizes `source` to `targetDb` dBFS. Never changes the source's own data. */
export function normalizePcmSource(source: PcmSource, targetDb: number): NormalizeResult {
  const plan = planNormalization(computePeakAmplitude(source), targetDb);

  if (!plan.ok) return { plan };

  const output = applyGainToPcmSource(source, plan.gain);
  return { plan, output, outputPeak: computePeakAmplitude(output) };
}
