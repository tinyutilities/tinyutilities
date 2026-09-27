"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type AudioContextWindow = Window & { webkitAudioContext?: typeof AudioContext };

/**
 * Plays an exact [startSec, endSec) range of an `AudioBuffer`, tracking a real playhead derived
 * from the `AudioContext`'s own clock (never a `setInterval` counter, which drifts from actual
 * audio output). `AudioBufferSourceNode`s are one-shot by spec — a new one is created for every
 * `play()` call, and the previous one is always stopped/disconnected first, so rapid
 * play/pause/replay can never leave two sources running into the same destination at once.
 */
export function useAudioPlayback(buffer: AudioBuffer | null) {
  const contextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const playStartContextTimeRef = useRef(0);
  const playStartOffsetRef = useRef(0);
  const playRateRef = useRef(1);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  const getContext = useCallback(() => {
    if (!contextRef.current) {
      const Ctor = window.AudioContext || (window as AudioContextWindow).webkitAudioContext;
      contextRef.current = new Ctor();
    }
    return contextRef.current;
  }, []);

  const cancelTicker = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  /** Stops and fully disconnects any in-flight source, and clears its `onended` handler first
   *  so a manual stop is never mistaken for the clip reaching its natural end. */
  const stopSource = useCallback(() => {
    const source = sourceRef.current;
    if (source) {
      source.onended = null;
      try {
        source.stop();
      } catch {
        // Already stopped — nothing to do.
      }
      source.disconnect();
      sourceRef.current = null;
    }
    if (gainNodeRef.current) {
      gainNodeRef.current.disconnect();
      gainNodeRef.current = null;
    }
    cancelTicker();
  }, []);

  const play = useCallback(
    // `bufferOverride` covers callers that just computed a buffer asynchronously (e.g. Audio
    // Joiner building its joined buffer on demand) and want to play it immediately — using the
    // hook's own `buffer` argument there would read a stale `null` closed over from before that
    // computation finished, since a state update doesn't retroactively change an
    // already-created callback within the same tick. Callers whose buffer is already reflected
    // in the hook's own state (e.g. Audio Trimmer) can omit it and rely on `buffer` as before.
    // `rate` drives `AudioBufferSourceNode.playbackRate` (e.g. Audio Speed Changer's live
    // preview) and `gain` drives a `GainNode` spliced between the source and the destination
    // (e.g. Audio Volume Changer's live preview) — both default to unity, so every existing
    // caller is completely unaffected.
    async (startSec: number, endSec: number, bufferOverride?: AudioBuffer, rate = 1, gain = 1) => {
      const activeBuffer = bufferOverride ?? buffer;
      if (!activeBuffer) return;
      stopSource();

      const context = getContext();
      // Must be awaited: resume() is async, and if the context is still suspended when we read
      // `context.currentTime` below (e.g. right after a browser auto-suspend, or on a fresh
      // context before any user-gesture-triggered resume has landed), that timestamp is stale —
      // every subsequent tick's elapsed-time math would be offset from the wrong origin.
      if (context.state !== "running") {
        await context.resume();
      }

      const clampedStart = Math.max(0, Math.min(startSec, activeBuffer.duration));
      const clampedEnd = Math.max(clampedStart, Math.min(endSec, activeBuffer.duration));
      const rangeDuration = clampedEnd - clampedStart;
      if (rangeDuration <= 0) return;

      const source = context.createBufferSource();
      source.buffer = activeBuffer;
      source.playbackRate.value = rate;

      const gainNode = context.createGain();
      gainNode.gain.value = gain;
      source.connect(gainNode);
      gainNode.connect(context.destination);
      gainNodeRef.current = gainNode;

      playStartContextTimeRef.current = context.currentTime;
      playStartOffsetRef.current = clampedStart;
      playRateRef.current = rate;

      source.onended = () => {
        if (sourceRef.current !== source) return; // superseded by a later play()/stop()
        sourceRef.current = null;
        cancelTicker();
        setIsPlaying(false);
        setCurrentTime(clampedEnd);
      };

      source.start(0, clampedStart, rangeDuration);
      sourceRef.current = source;
      setIsPlaying(true);
      setCurrentTime(clampedStart);

      const tick = () => {
        const context2 = contextRef.current;
        if (!context2 || sourceRef.current !== source) return;

        const elapsed = context2.currentTime - playStartContextTimeRef.current;
        const position = Math.min(clampedEnd, playStartOffsetRef.current + elapsed * playRateRef.current);
        setCurrentTime(position);

        if (position < clampedEnd) {
          rafRef.current = requestAnimationFrame(tick);
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    },
    [buffer, getContext, stopSource],
  );

  /** Stops playback and freezes the playhead at its current position (a true "pause": calling
   *  `play()` again with that position as `startSec` resumes from exactly here). */
  const pause = useCallback(() => {
    const context = contextRef.current;
    if (context && sourceRef.current) {
      const elapsed = context.currentTime - playStartContextTimeRef.current;
      setCurrentTime(playStartOffsetRef.current + elapsed * playRateRef.current);
    }
    stopSource();
    setIsPlaying(false);
  }, [stopSource]);

  /** Stops playback and moves the playhead to an explicit position — used when the user clicks
   *  elsewhere on the waveform, or when the selection changes out from under an active/paused
   *  playhead. */
  const seek = useCallback(
    (timeSec: number) => {
      stopSource();
      setIsPlaying(false);
      setCurrentTime(timeSec);
    },
    [stopSource],
  );

  useEffect(() => {
    return () => {
      stopSource();
      if (contextRef.current) {
        void contextRef.current.close().catch(() => {});
        contextRef.current = null;
      }
    };
  }, [stopSource]);

  return { isPlaying, currentTime, play, pause, seek };
}
