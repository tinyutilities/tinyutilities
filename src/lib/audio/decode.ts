"use client";

import { isDecodedSizeSafe, maxUploadFileBytes } from "./memory-guard";

export type DecodeAudioError = {
  message: string;
};

export type DecodeAudioResult =
  | { ok: true; buffer: AudioBuffer }
  | { ok: false; error: DecodeAudioError };

/**
 * Decodes an uploaded audio file into an `AudioBuffer` using the browser's native
 * `decodeAudioData()` — no format-specific handling of our own, so support is exactly whatever
 * the browser's own media pipeline can decode, honestly reported rather than assumed from the
 * file extension.
 *
 * A short-lived `AudioContext` is created just for decoding and always closed afterward
 * (regardless of success or failure), since `decodeAudioData` doesn't need a running context —
 * only its decoder.
 */
export async function decodeAudioFile(file: File): Promise<DecodeAudioResult> {
  if (file.size === 0) {
    return { ok: false, error: { message: "This file is empty." } };
  }

  if (file.size > maxUploadFileBytes) {
    return {
      ok: false,
      error: { message: "That audio file is too large to process safely in your browser." },
    };
  }

  const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextCtor) {
    return {
      ok: false,
      error: { message: "Your browser doesn't support the Web Audio API needed for this tool." },
    };
  }

  const context = new AudioContextCtor();

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = await context.decodeAudioData(arrayBuffer);

    if (!isDecodedSizeSafe(buffer.numberOfChannels, buffer.sampleRate, buffer.duration)) {
      return {
        ok: false,
        error: { message: "That audio file is too large to process safely in your browser." },
      };
    }

    return { ok: true, buffer };
  } catch (error) {
    console.error("decodeAudioFile failed:", error);
    return {
      ok: false,
      error: { message: "Unable to read this audio file. It may be corrupted or unsupported by your browser." },
    };
  } finally {
    void context.close().catch(() => {});
  }
}
