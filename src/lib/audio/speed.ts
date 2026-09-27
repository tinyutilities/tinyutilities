import { estimateDecodedPcmBytes } from "./memory-guard";

/**
 * Speed-change math — pure, framework-free, and fully unit-testable. The actual sample
 * processing (which genuinely requires a browser) lives in `speed-processor.ts`.
 */

export const minSpeed = 0.5;
export const maxSpeed = 2;

/** The quick-pick speed buttons shown in the UI, in display order. */
export const speedPresets = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;

export function isSpeedValid(speed: number): boolean {
  return Number.isFinite(speed) && speed >= minSpeed && speed <= maxSpeed;
}

export function clampSpeed(speed: number): number {
  if (!Number.isFinite(speed)) return 1;
  return Math.min(maxSpeed, Math.max(minSpeed, speed));
}

/** Speeding audio up shortens it and slowing it down lengthens it — duration always moves
 *  inversely with speed, never linearly (2x speed is HALF the duration, not double). */
export function computeOutputDuration(inputDuration: number, speed: number): number {
  if (!Number.isFinite(inputDuration) || inputDuration <= 0) return 0;
  if (!isSpeedValid(speed)) return inputDuration;
  return inputDuration / speed;
}

/** Same estimate `memory-guard.ts` uses for any decoded PCM buffer, applied to the speed-changed
 *  OUTPUT duration rather than the input — a slow-down (e.g. 0.5x) can produce a buffer several
 *  times larger than the source file's own decoded footprint. */
export function estimateSpeedOutputBytes(
  channels: number,
  sampleRate: number,
  inputDuration: number,
  speed: number,
): number {
  return estimateDecodedPcmBytes(channels, sampleRate, computeOutputDuration(inputDuration, speed));
}
