import type { PcmSource } from "./types";

/**
 * Fade in / fade out: a gain envelope that ramps from silence to full level at the start of a
 * clip and/or from full level to silence at the end. The same envelope is applied to every channel.
 * Pure and framework-free, so every sample can be checked in Node/Vitest.
 */

export type FadeCurve = "linear" | "smooth" | "exponential";

export const fadeCurves: Array<{ value: FadeCurve; label: string; description: string }> = [
  { value: "linear", label: "Linear", description: "A constant-rate ramp. Simple and predictable." },
  { value: "smooth", label: "Smooth (S-curve)", description: "Eases in and out of the ramp; often sounds more natural." },
  { value: "exponential", label: "Exponential", description: "Starts slowly then speeds up, which can sound more even to the ear." },
];

/** Longest fade offered in the UI. Fades may still be shorter than the clip. */
export const maxFadeSeconds = 60;

/** Gain (0–1) at position `x` through a fade, where 0 is silence and 1 is full level. */
export function fadeGain(x: number, curve: FadeCurve): number {
  const clamped = Math.min(1, Math.max(0, x));

  switch (curve) {
    case "smooth":
      return 0.5 - 0.5 * Math.cos(Math.PI * clamped);
    case "exponential":
      return clamped * clamped;
    default:
      return clamped;
  }
}

export type FadeOptions = {
  fadeInSeconds: number;
  fadeOutSeconds: number;
  curve: FadeCurve;
};

export type FadePlan =
  | { ok: true; fadeInFrames: number; fadeOutFrames: number }
  | { ok: false; error: string };

/**
 * Converts fade durations to whole frames and checks they fit. The two fades may meet but never
 * overlap, so their combined length can't exceed the clip.
 */
export function planFade(totalFrames: number, sampleRate: number, options: FadeOptions): FadePlan {
  const { fadeInSeconds, fadeOutSeconds } = options;

  if (![fadeInSeconds, fadeOutSeconds].every((value) => Number.isFinite(value) && value >= 0)) {
    return { ok: false, error: "Fade lengths must be zero or more seconds." };
  }

  if (fadeInSeconds > maxFadeSeconds || fadeOutSeconds > maxFadeSeconds) {
    return { ok: false, error: `Fades can be at most ${maxFadeSeconds} seconds long.` };
  }

  const fadeInFrames = Math.round(fadeInSeconds * sampleRate);
  const fadeOutFrames = Math.round(fadeOutSeconds * sampleRate);

  if (fadeInFrames + fadeOutFrames > totalFrames) {
    return { ok: false, error: "The fade in and fade out are longer than the clip together. Shorten one of them." };
  }

  return { ok: true, fadeInFrames, fadeOutFrames };
}

/** The gain applied to frame `index` of a clip of `totalFrames` frames. */
export function envelopeAt(index: number, totalFrames: number, fadeInFrames: number, fadeOutFrames: number, curve: FadeCurve): number {
  let gain = 1;

  // The first frame of a fade-in is silent and full level is reached after `fadeInFrames` frames.
  if (fadeInFrames > 0 && index < fadeInFrames) {
    gain = Math.min(gain, fadeGain(index / fadeInFrames, curve));
  }

  // The last frame of the clip is silent when a fade-out is applied.
  const framesFromEnd = totalFrames - 1 - index;
  if (fadeOutFrames > 0 && framesFromEnd < fadeOutFrames) {
    gain = Math.min(gain, fadeGain(framesFromEnd / fadeOutFrames, curve));
  }

  return gain;
}

export type FadeResult = { ok: true; output: PcmSource; fadeInFrames: number; fadeOutFrames: number } | { ok: false; error: string };

/**
 * Applies the fades to a copy of `source`. Samples outside the fades are copied unchanged, the
 * source is never modified, and the length, sample rate and channel count never change. With no
 * fade requested the source itself is returned, since there is nothing to do.
 */
export function applyFade(source: PcmSource, options: FadeOptions): FadeResult {
  const plan = planFade(source.length, source.sampleRate, options);

  if (!plan.ok) return plan;

  if (plan.fadeInFrames === 0 && plan.fadeOutFrames === 0) {
    return { ok: true, output: source, fadeInFrames: 0, fadeOutFrames: 0 };
  }

  const total = source.length;
  const channelData: Float32Array[] = [];

  for (let channel = 0; channel < source.numberOfChannels; channel += 1) {
    const input = source.getChannelData(channel);
    const output = new Float32Array(input);

    for (let index = 0; index < Math.min(plan.fadeInFrames, total); index += 1) {
      output[index] = input[index] * envelopeAt(index, total, plan.fadeInFrames, plan.fadeOutFrames, options.curve);
    }

    for (let index = Math.max(plan.fadeInFrames, total - plan.fadeOutFrames); index < total; index += 1) {
      output[index] = input[index] * envelopeAt(index, total, plan.fadeInFrames, plan.fadeOutFrames, options.curve);
    }

    channelData.push(output);
  }

  return {
    ok: true,
    fadeInFrames: plan.fadeInFrames,
    fadeOutFrames: plan.fadeOutFrames,
    output: {
      sampleRate: source.sampleRate,
      numberOfChannels: source.numberOfChannels,
      length: total,
      getChannelData: (channel: number) => channelData[channel],
    },
  };
}
